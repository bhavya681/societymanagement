import { Request, Response } from "express";
import { RecurringExpense } from "../models/RecurringExpense";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { writeAudit } from "../services/audit.service";

export const listRecurringExpenses = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "nextDueDate");
  const filter: Record<string, unknown> = { societyId: sid };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  const [rows, total] = await Promise.all([
    RecurringExpense.find(filter).populate("vendorId").sort(sort).skip(skip).limit(limit),
    RecurringExpense.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const createRecurringExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await RecurringExpense.create({
    societyId: societyId(req),
    title: req.body.title,
    category: req.body.category,
    description: req.body.description ?? "",
    expectedAmount: req.body.expectedAmount,
    vendorId: req.body.vendorId ?? null,
    frequency: req.body.frequency,
    startDate: new Date(req.body.startDate),
    endDate: req.body.endDate ? new Date(req.body.endDate) : null,
    nextDueDate: new Date(req.body.nextDueDate),
    paymentMethod: req.body.paymentMethod ?? "BANK_TRANSFER",
    status: req.body.status ?? "ACTIVE",
    createdBy: req.user!.id,
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "recurring_expense.created",
    entity: "RecurringExpense",
    entityId: String(expense._id),
    metadata: { title: expense.title, frequency: expense.frequency },
  });
  return created(res, publicDoc(expense), "Recurring expense created");
});

export const updateRecurringExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await RecurringExpense.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!expense) throw AppError.notFound("Recurring expense not found", "RECURRING_EXPENSE_NOT_FOUND");
  const body = req.body;
  if (body.title) expense.title = body.title;
  if (body.category) expense.category = body.category;
  if (body.description !== undefined) expense.description = body.description;
  if (body.expectedAmount !== undefined) expense.expectedAmount = body.expectedAmount;
  if (body.vendorId !== undefined) expense.vendorId = body.vendorId;
  if (body.frequency) expense.frequency = body.frequency;
  if (body.startDate) expense.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) expense.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.nextDueDate) expense.nextDueDate = new Date(body.nextDueDate);
  if (body.paymentMethod) expense.paymentMethod = body.paymentMethod;
  if (body.status) expense.status = body.status;
  await expense.save();
  return success(res, publicDoc(expense), "Recurring expense updated");
});

export const deleteRecurringExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await RecurringExpense.findOneAndDelete({ _id: req.params.id, societyId: societyId(req) });
  if (!expense) throw AppError.notFound("Recurring expense not found", "RECURRING_EXPENSE_NOT_FOUND");
  return success(res, { id: req.params.id }, "Recurring expense deleted");
});
