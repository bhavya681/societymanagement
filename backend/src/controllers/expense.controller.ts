import { Request, Response } from "express";
import { Expense } from "../models/Expense";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { escapeRegex, societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { rupeesToPaise } from "../utils/money";
import { writeAudit } from "../services/audit.service";

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "expenseDate");
  const filter: Record<string, unknown> = { societyId: sid };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), "i");
    filter.$or = [{ title: rx }, { vendor: rx }, { invoiceNumber: rx }];
  }
  const [rows, total] = await Promise.all([
    Expense.find(filter).populate("createdBy", "name").sort(sort).skip(skip).limit(limit),
    Expense.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.amount <= 0) throw AppError.badRequest("Expense amount must be positive", "INVALID_AMOUNT");
  const expense = await Expense.create({
    societyId: societyId(req),
    title: req.body.title,
    category: req.body.category,
    description: req.body.description ?? "",
    amount: rupeesToPaise(req.body.amount),
    vendor: req.body.vendor ?? "",
    invoiceNumber: req.body.invoiceNumber ?? "",
    expenseDate: new Date(req.body.expenseDate),
    paymentMethod: req.body.paymentMethod ?? "BANK_TRANSFER",
    status: req.body.status ?? "PAID",
    createdBy: req.user!.id,
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "expense.created",
    entity: "Expense",
    entityId: String(expense._id),
    metadata: { amount: req.body.amount, category: req.body.category },
  });
  return created(res, publicDoc(expense), "Expense recorded");
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!expense) throw AppError.notFound("Expense not found", "EXPENSE_NOT_FOUND");
  const body = req.body;
  if (body.title) expense.title = body.title;
  if (body.category) expense.category = body.category;
  if (body.description !== undefined) expense.description = body.description;
  if (body.amount !== undefined) {
    if (body.amount <= 0) throw AppError.badRequest("Expense amount must be positive", "INVALID_AMOUNT");
    expense.amount = rupeesToPaise(body.amount);
  }
  if (body.vendor !== undefined) expense.vendor = body.vendor;
  if (body.invoiceNumber !== undefined) expense.invoiceNumber = body.invoiceNumber;
  if (body.expenseDate) expense.expenseDate = new Date(body.expenseDate);
  if (body.paymentMethod) expense.paymentMethod = body.paymentMethod;
  if (body.status) expense.status = body.status;
  await expense.save();
  return success(res, publicDoc(expense), "Expense updated");
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, societyId: societyId(req) });
  if (!expense) throw AppError.notFound("Expense not found", "EXPENSE_NOT_FOUND");
  return success(res, { id: req.params.id }, "Expense deleted");
});
