import { Types } from "mongoose";
import { Bill } from "../models/Bill";
import { Flat } from "../models/Flat";
import { Society } from "../models/Society";
import { AppError } from "../utils/AppError";
import { computeBillTotalPaise, rupeesToPaise } from "../utils/money";
import { applyPenaltyIfDue, deriveBillStatus, PenaltyConfig } from "./penalty.service";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export async function nextBillNumber(societyId: string) {
  const year = new Date().getFullYear();
  const prefix = `MH-${year}-`;
  const latest = await Bill.findOne({ societyId, billNumber: new RegExp(`^${prefix}`) })
    .sort({ billNumber: -1 })
    .select("billNumber")
    .lean();
  const seq = latest ? Number(String(latest.billNumber).split("-").pop()) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

export function remainingPaise(total: number, paid: number) {
  return Math.max(0, total - paid);
}

export async function refreshBillStatus(billId: Types.ObjectId | string, penaltyConfig?: PenaltyConfig) {
  const bill = await Bill.findById(billId);
  if (!bill) throw AppError.notFound("Bill not found", "BILL_NOT_FOUND");
  if (bill.status === "CANCELLED") return bill;

  let config = penaltyConfig;
  if (!config) {
    const society = await Society.findById(bill.societyId);
    config = society?.penaltyConfig as PenaltyConfig;
  }

  if (config) {
    const result = applyPenaltyIfDue({
      dueDate: bill.dueDate,
      baseAmount: bill.baseAmount,
      additionalCharges: bill.additionalCharges,
      discount: bill.discount,
      currentPenalty: bill.penalty,
      paidAmount: bill.paidAmount,
      status: bill.status,
      config,
    });
    if (result.applied) {
      bill.penalty = result.penalty;
      bill.totalAmount = result.totalAmount;
      bill.penaltyAppliedAt = new Date();
    }
  }

  bill.totalAmount = computeBillTotalPaise({
    baseAmount: bill.baseAmount,
    additionalCharges: bill.additionalCharges,
    penalty: bill.penalty,
    discount: bill.discount,
  });
  bill.status = deriveBillStatus({
    totalAmount: bill.totalAmount,
    paidAmount: bill.paidAmount,
    dueDate: bill.dueDate,
    currentStatus: bill.status,
  });
  await bill.save();
  return bill;
}

export async function generateMaintenanceBills(input: {
  societyId: string;
  billingMonth: number;
  billingYear: number;
  dueDate: Date;
  baseAmountRupees?: number;
  additionalChargeItems?: { label: string; amount: number }[];
  discountRupees?: number;
  notes?: string;
  flatIds?: string[];
  billKind?: "MAINTENANCE" | "ADDITIONAL";
}) {
  const society = await Society.findById(input.societyId);
  if (!society) throw AppError.notFound("Society not found", "SOCIETY_NOT_FOUND");

  const filter: Record<string, unknown> = { societyId: input.societyId, status: "ACTIVE" };
  if (input.flatIds?.length) filter._id = { $in: input.flatIds };

  const flats = await Flat.find(filter);
  if (flats.length === 0) throw AppError.badRequest("No flats found to bill", "NO_FLATS");

  const additionalItems = (input.additionalChargeItems ?? []).map((item) => ({
    label: item.label,
    amount: rupeesToPaise(item.amount),
  }));
  const additionalCharges = additionalItems.reduce((sum, item) => sum + item.amount, 0);
  const discount = rupeesToPaise(input.discountRupees ?? 0);
  const baseAmount =
    input.baseAmountRupees !== undefined
      ? rupeesToPaise(input.baseAmountRupees)
      : society.defaultMaintenancePaise;
  const billKind = input.billKind ?? "MAINTENANCE";

  const created = [];
  const skipped: { flatNumber: string; reason: string }[] = [];

  for (const flat of flats) {
    const existing = await Bill.findOne({
      societyId: input.societyId,
      flatId: flat._id,
      billingMonth: input.billingMonth,
      billingYear: input.billingYear,
      billKind: "MAINTENANCE",
      status: { $ne: "CANCELLED" },
    });

    if (existing && billKind === "MAINTENANCE") {
      skipped.push({
        flatNumber: flat.flatNumber,
        reason: "A maintenance bill already exists for this period",
      });
      continue;
    }

    const residentId = flat.occupants[0] || flat.owner || null;
    const totalAmount = computeBillTotalPaise({
      baseAmount,
      additionalCharges,
      penalty: 0,
      discount,
    });

    const bill = await Bill.create({
      billNumber: await nextBillNumber(input.societyId),
      societyId: input.societyId,
      flatId: flat._id,
      residentId,
      billingMonth: input.billingMonth,
      billingYear: input.billingYear,
      billKind,
      baseAmount,
      additionalCharges,
      additionalChargeItems: additionalItems,
      penalty: 0,
      discount,
      totalAmount,
      paidAmount: 0,
      dueDate: input.dueDate,
      status: deriveBillStatus({
        totalAmount,
        paidAmount: 0,
        dueDate: input.dueDate,
        currentStatus: "PENDING",
      }),
      notes: input.notes ?? `Maintenance ${pad(input.billingMonth)}/${input.billingYear}`,
    });
    created.push(bill);
  }

  return { created, skipped };
}

export async function syncOverdueBills(societyId: string) {
  const society = await Society.findById(societyId);
  if (!society) return 0;
  const bills = await Bill.find({
    societyId,
    status: { $in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
  });
  let updated = 0;
  for (const bill of bills) {
    const before = bill.status;
    await refreshBillStatus(bill._id, society.penaltyConfig as PenaltyConfig);
    if (before !== (await Bill.findById(bill._id))?.status) updated += 1;
    else updated += 1;
  }
  return updated;
}
