import { Types } from "mongoose";
import { Bill } from "../models/Bill";
import { Payment } from "../models/Payment";
import { AppError } from "../utils/AppError";
import { rupeesToPaise } from "../utils/money";
import { refreshBillStatus, remainingPaise } from "./billing.service";
import { writeAudit } from "./audit.service";

export async function recordPayment(input: {
  billId: string;
  societyId: string;
  amountRupees: number;
  paymentMethod: string;
  transactionId?: string;
  paymentDate?: Date;
  notes?: string;
  recordedBy: string;
  status?: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
}) {
  const bill = await Bill.findOne({ _id: input.billId, societyId: input.societyId });
  if (!bill) throw AppError.notFound("Bill not found", "BILL_NOT_FOUND");
  if (bill.status === "CANCELLED") {
    throw AppError.badRequest("Cannot record payment against a cancelled bill", "BILL_CANCELLED");
  }
  if (bill.status === "PAID") {
    throw AppError.badRequest("Bill is already fully paid", "BILL_ALREADY_PAID");
  }

  const amount = rupeesToPaise(input.amountRupees);
  if (amount <= 0) throw AppError.badRequest("Payment amount must be greater than zero", "INVALID_AMOUNT");

  const remaining = remainingPaise(bill.totalAmount, bill.paidAmount);
  if (amount > remaining) {
    throw AppError.badRequest(
      `Payment exceeds remaining amount of ₹${(remaining / 100).toFixed(2)}`,
      "PAYMENT_EXCEEDS_REMAINING",
    );
  }

  if (!bill.residentId) {
    throw AppError.badRequest("Bill is not assigned to a resident", "BILL_UNASSIGNED");
  }

  const status = input.status ?? "SUCCESS";
  const payment = await Payment.create({
    billId: bill._id,
    societyId: input.societyId,
    residentId: bill.residentId,
    flatId: bill.flatId,
    amount,
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId ?? "",
    paymentDate: input.paymentDate ?? new Date(),
    status,
    notes: input.notes ?? "",
    recordedBy: new Types.ObjectId(input.recordedBy),
  });

  if (status === "SUCCESS") {
    bill.paidAmount += amount;
    await bill.save();
    await refreshBillStatus(bill._id);
  }

  await writeAudit({
    userId: input.recordedBy,
    societyId: input.societyId,
    action: "payment.recorded",
    entity: "Payment",
    entityId: String(payment._id),
    metadata: { billId: String(bill._id), amount: input.amountRupees, method: input.paymentMethod },
  });

  return payment;
}
