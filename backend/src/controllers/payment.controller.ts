import { Request, Response } from "express";
import { Payment } from "../models/Payment";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { assertResidentOwn, societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { isAdminLike } from "../middleware/role";
import { recordPayment } from "../services/payment.service";

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "paymentDate");
  const filter: Record<string, unknown> = { societyId: sid };
  if (!isAdminLike(req.user!.role)) filter.residentId = req.user!.id;
  if (req.query.method) filter.paymentMethod = req.query.method;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.billId) filter.billId = req.query.billId;
  const [rows, total] = await Promise.all([
    Payment.find(filter)
      .populate("residentId", "name email")
      .populate("flatId", "flatNumber")
      .populate("billId", "billNumber billingMonth billingYear")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findOne({ _id: req.params.id, societyId: societyId(req) })
    .populate("residentId", "name email")
    .populate("flatId", "flatNumber")
    .populate("billId", "billNumber");
  if (!payment) throw AppError.notFound("Payment not found", "PAYMENT_NOT_FOUND");
  assertResidentOwn(payment.residentId, req);
  return success(res, publicDoc(payment));
});

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await recordPayment({
    billId: req.body.billId,
    societyId: societyId(req),
    amountRupees: req.body.amount,
    paymentMethod: req.body.paymentMethod,
    transactionId: req.body.transactionId,
    paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
    notes: req.body.notes,
    recordedBy: req.user!.id,
  });
  return created(res, publicDoc(payment), "Payment recorded successfully");
});
