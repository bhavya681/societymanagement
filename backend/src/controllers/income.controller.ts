import { Request, Response } from "express";
import { Income } from "../models/Income";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { escapeRegex } from "../utils/access";
import { rupeesToPaise } from "../utils/money";
import { writeAudit } from "../services/audit.service";

export const listIncome = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "incomeDate");
  const filter: Record<string, unknown> = { societyId: sid };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), "i");
    filter.$or = [{ title: rx }, { payer: rx }, { reference: rx }];
  }
  const [rows, total] = await Promise.all([
    Income.find(filter).populate("createdBy", "name").sort(sort).skip(skip).limit(limit),
    Income.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const createIncome = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.amount <= 0) throw AppError.badRequest("Income amount must be positive", "INVALID_AMOUNT");
  const income = await Income.create({
    societyId: societyId(req),
    title: req.body.title,
    category: req.body.category,
    amount: rupeesToPaise(req.body.amount),
    payer: req.body.payer ?? "",
    reference: req.body.reference ?? "",
    incomeDate: new Date(req.body.incomeDate),
    paymentMethod: req.body.paymentMethod ?? "BANK_TRANSFER",
    notes: req.body.notes ?? "",
    createdBy: req.user!.id,
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "income.created",
    entity: "Income",
    entityId: String(income._id),
    metadata: { amount: req.body.amount, category: income.category },
  });
  return created(res, publicDoc(income), "Income recorded");
});

export const updateIncome = asyncHandler(async (req: Request, res: Response) => {
  const income = await Income.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!income) throw AppError.notFound("Income not found", "INCOME_NOT_FOUND");
  const body = req.body;
  if (body.title) income.title = body.title;
  if (body.category) income.category = body.category;
  if (body.amount !== undefined) {
    if (body.amount <= 0) throw AppError.badRequest("Income amount must be positive", "INVALID_AMOUNT");
    income.amount = rupeesToPaise(body.amount);
  }
  if (body.payer !== undefined) income.payer = body.payer;
  if (body.reference !== undefined) income.reference = body.reference;
  if (body.incomeDate) income.incomeDate = new Date(body.incomeDate);
  if (body.paymentMethod) income.paymentMethod = body.paymentMethod;
  if (body.notes !== undefined) income.notes = body.notes;
  await income.save();
  return success(res, publicDoc(income), "Income updated");
});

export const deleteIncome = asyncHandler(async (req: Request, res: Response) => {
  const income = await Income.findOneAndDelete({ _id: req.params.id, societyId: societyId(req) });
  if (!income) throw AppError.notFound("Income not found", "INCOME_NOT_FOUND");
  return success(res, { id: req.params.id }, "Income deleted");
});
