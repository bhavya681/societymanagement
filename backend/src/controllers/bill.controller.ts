import { Request, Response } from "express";
import { Bill } from "../models/Bill";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { assertResidentOwn, escapeRegex, societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { isAdminLike } from "../middleware/role";
import { generateMaintenanceBills, refreshBillStatus } from "../services/billing.service";
import { recordPayment } from "../services/payment.service";
import { writeAudit } from "../services/audit.service";
import { rupeesToPaise, computeBillTotalPaise } from "../utils/money";
import { deriveBillStatus } from "../services/penalty.service";

export const listBills = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "createdAt");
  const filter: Record<string, unknown> = { societyId: sid };
  if (!isAdminLike(req.user!.role)) {
    filter.residentId = req.user!.id;
  } else if (req.query.residentId) {
    filter.residentId = req.query.residentId;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.month) filter.billingMonth = Number(req.query.month);
  if (req.query.year) filter.billingYear = Number(req.query.year);
  if (req.query.flatId) filter.flatId = req.query.flatId;
  if (req.query.search) {
    filter.billNumber = new RegExp(escapeRegex(String(req.query.search)), "i");
  }
  const [rows, total] = await Promise.all([
    Bill.find(filter)
      .populate("flatId", "flatNumber")
      .populate("residentId", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Bill.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const getBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await Bill.findOne({ _id: req.params.id, societyId: societyId(req) })
    .populate("flatId", "flatNumber")
    .populate("residentId", "name email phone");
  if (!bill) throw AppError.notFound("Bill not found", "BILL_NOT_FOUND");
  assertResidentOwn(bill.residentId, req);
  return success(res, publicDoc(bill));
});

export const outstandingBills = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const residentId = req.query.residentId;
  const filter: Record<string, unknown> = { societyId: sid, status: { $ne: "CANCELLED" } };
  if (residentId) filter.residentId = residentId;
  const bills = await Bill.find(filter)
    .populate("flatId", "flatNumber")
    .populate("residentId", "name email")
    .sort({ dueDate: 1 });
  return success(res, bills.map(publicDoc));
});

export const generateBills = asyncHandler(async (req: Request, res: Response) => {
  const result = await generateMaintenanceBills({
    societyId: societyId(req),
    billingMonth: req.body.billingMonth,
    billingYear: req.body.billingYear,
    dueDate: new Date(req.body.dueDate),
    baseAmountRupees: req.body.baseAmount,
    additionalChargeItems: req.body.additionalChargeItems,
    discountRupees: req.body.discount,
    notes: req.body.notes,
    flatIds: req.body.flatIds,
    billKind: req.body.billKind,
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "bills.generated",
    entity: "Bill",
    metadata: {
      month: req.body.billingMonth,
      year: req.body.billingYear,
      created: result.created.length,
      skipped: result.skipped.length,
    },
  });
  return created(
    res,
    { created: result.created.map(publicDoc), skipped: result.skipped },
    `${result.created.length} bill(s) generated`,
  );
});

export const updateBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await Bill.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!bill) throw AppError.notFound("Bill not found", "BILL_NOT_FOUND");
  if (req.body.status === "PAID" && bill.paidAmount < bill.totalAmount) {
    throw AppError.badRequest("Cannot mark as paid without a matching payment", "PAYMENT_REQUIRED");
  }
  if (req.body.additionalChargeItems) {
    bill.additionalChargeItems = req.body.additionalChargeItems.map(
      (item: { label: string; amount: number }) => ({
        label: item.label,
        amount: rupeesToPaise(item.amount),
      }),
    );
    bill.additionalCharges = bill.additionalChargeItems.reduce((sum, item) => sum + item.amount, 0);
  }
  if (req.body.discount !== undefined) bill.discount = rupeesToPaise(req.body.discount);
  if (req.body.penalty !== undefined) bill.penalty = rupeesToPaise(req.body.penalty);
  if (req.body.dueDate) bill.dueDate = new Date(req.body.dueDate);
  if (req.body.notes !== undefined) bill.notes = req.body.notes;
  if (req.body.status === "CANCELLED") bill.status = "CANCELLED";
  if (bill.status !== "CANCELLED") {
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
  }
  await bill.save();
  return success(res, publicDoc(bill), "Bill updated");
});

export const payBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await Bill.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!bill) throw AppError.notFound("Bill not found", "BILL_NOT_FOUND");
  if (!isAdminLike(req.user!.role)) assertResidentOwn(bill.residentId, req);
  const payment = await recordPayment({
    billId: String(bill._id),
    societyId: societyId(req),
    amountRupees: req.body.amount,
    paymentMethod: req.body.paymentMethod,
    transactionId: req.body.transactionId,
    paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
    notes: req.body.notes,
    recordedBy: req.user!.id,
  });
  const updated = await refreshBillStatus(bill._id);
  return created(res, { payment: publicDoc(payment), bill: publicDoc(updated) }, "Payment recorded successfully");
});
