import { Request, Response } from "express";
import { SocietyDocument } from "../models/Document";
import { AuditLog } from "../models/AuditLog";
import { User } from "../models/User";
import { Bill } from "../models/Bill";
import { Payment } from "../models/Payment";
import { Expense } from "../models/Expense";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { isAdminLike } from "../middleware/role";
import { toCsv } from "../utils/csv";
import { paiseToRupees } from "../utils/money";

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { societyId: societyId(req) };
  if (!isAdminLike(req.user!.role)) filter.visibleToResidents = true;
  if (req.query.category) filter.category = req.query.category;
  const rows = await SocietyDocument.find(filter).populate("uploadedBy", "name").sort({ createdAt: -1 });
  return success(res, rows.map(publicDoc));
});

export const createDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await SocietyDocument.create({
    societyId: societyId(req),
    title: req.body.title,
    category: req.body.category,
    description: req.body.description ?? "",
    url: req.body.url ?? "",
    fileName: req.body.fileName ?? "",
    storageProvider: req.body.storageProvider ?? "external_url",
    visibleToResidents: req.body.visibleToResidents ?? true,
    uploadedBy: req.user!.id,
  });
  return created(res, publicDoc(doc), "Document added");
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await SocietyDocument.findOneAndDelete({ _id: req.params.id, societyId: societyId(req) });
  if (!doc) throw AppError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
  return success(res, { id: req.params.id }, "Document removed");
});

export const listAudit = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, "timestamp");
  const filter: Record<string, unknown> = { societyId: societyId(req) };
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.action) filter.action = req.query.action;
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).populate("userId", "name email").sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const type = req.params.type;
  let csv = "";
  let filename = "export.csv";

  if (type === "residents") {
    const rows = await User.find({ societyId: sid, role: { $in: ["RESIDENT", "COMMITTEE"] } }).populate(
      "flatId",
      "flatNumber",
    );
    csv = toCsv(
      rows.map((r) => ({
        name: r.name,
        email: r.email,
        phone: r.phone,
        flat: (r.flatId as { flatNumber?: string } | null)?.flatNumber ?? "",
        status: r.status,
        occupancyRole: r.occupancyRole ?? "",
      })),
    );
    filename = "residents.csv";
  } else if (type === "payments") {
    const rows = await Payment.find({ societyId: sid }).populate("residentId", "name").populate("flatId", "flatNumber");
    csv = toCsv(
      rows.map((r) => ({
        date: r.paymentDate.toISOString().slice(0, 10),
        resident: (r.residentId as { name?: string }).name,
        flat: (r.flatId as { flatNumber?: string }).flatNumber,
        amount: paiseToRupees(r.amount),
        method: r.paymentMethod,
        status: r.status,
        transactionId: r.transactionId,
      })),
    );
    filename = "payments.csv";
  } else if (type === "bills") {
    const rows = await Bill.find({ societyId: sid }).populate("flatId", "flatNumber").populate("residentId", "name");
    csv = toCsv(
      rows.map((r) => ({
        billNumber: r.billNumber,
        flat: (r.flatId as { flatNumber?: string }).flatNumber,
        resident: (r.residentId as { name?: string } | null)?.name ?? "",
        month: r.billingMonth,
        year: r.billingYear,
        total: paiseToRupees(r.totalAmount),
        paid: paiseToRupees(r.paidAmount),
        status: r.status,
      })),
    );
    filename = "bills.csv";
  } else if (type === "expenses") {
    const rows = await Expense.find({ societyId: sid });
    csv = toCsv(
      rows.map((r) => ({
        date: r.expenseDate.toISOString().slice(0, 10),
        title: r.title,
        category: r.category,
        vendor: r.vendor,
        amount: paiseToRupees(r.amount),
        status: r.status,
      })),
    );
    filename = "expenses.csv";
  } else if (type === "requests") {
    const rows = await MaintenanceRequest.find({ societyId: sid }).populate("createdBy", "name");
    csv = toCsv(
      rows.map((r) => ({
        title: r.title,
        category: r.category,
        priority: r.priority,
        status: r.status,
        resident: (r.createdBy as { name?: string }).name,
        createdAt: r.createdAt.toISOString(),
      })),
    );
    filename = "requests.csv";
  } else {
    throw AppError.badRequest("Unknown export type", "INVALID_EXPORT");
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
});
