import { Request, Response } from "express";
import { Types } from "mongoose";
import { MonthClosing } from "../models/MonthClosing";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import { societyId } from "../utils/access";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { writeAudit } from "../services/audit.service";
import { financialSummary } from "../services/report.service";

export const listMonthClosings = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const closings = await MonthClosing.find({ societyId: sid }).sort({ billingYear: -1, billingMonth: -1 });
  return success(res, closings.map(publicDoc));
});

export const getMonthClosing = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const closing = await MonthClosing.findOne({ societyId: sid, billingMonth: month, billingYear: year });
  if (!closing) {
    return success(res, {
      societyId: sid,
      billingMonth: month,
      billingYear: year,
      status: "OPEN",
      closedAt: null,
      closedBy: null,
      reopenedAt: null,
      reopenedBy: null,
      notes: "",
    });
  }
  return success(res, publicDoc(closing));
});

export const closeMonth = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const month = Number(req.body.month) || new Date().getMonth() + 1;
  const year = Number(req.body.year) || new Date().getFullYear();
  const summary = await financialSummary(sid);
  let closing = await MonthClosing.findOne({ societyId: sid, billingMonth: month, billingYear: year });
  if (closing) {
    if (closing.status === "CLOSED") {
      throw AppError.badRequest("Month is already closed", "MONTH_ALREADY_CLOSED");
    }
    closing.status = "CLOSED";
    closing.closedAt = new Date();
    closing.closedBy = new Types.ObjectId(req.user!.id);
    closing.notes = req.body.notes ?? closing.notes;
    closing.totalBilled = summary.totalBilled;
    closing.totalCollected = summary.totalCollected;
    closing.totalOutstanding = summary.outstanding;
    closing.totalPenalty = summary.penaltiesCollected;
    closing.totalExpenses = summary.totalExpenses;
    await closing.save();
  } else {
    closing = await MonthClosing.create({
      societyId: sid,
      billingMonth: month,
      billingYear: year,
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: new Types.ObjectId(req.user!.id),
      notes: req.body.notes ?? "",
      totalBilled: summary.totalBilled,
      totalCollected: summary.totalCollected,
      totalOutstanding: summary.outstanding,
      totalPenalty: summary.penaltiesCollected,
      totalExpenses: summary.totalExpenses,
    });
  }
  await writeAudit({
    userId: req.user!.id,
    societyId: sid,
    action: "month.closed",
    entity: "MonthClosing",
    entityId: String(closing._id),
    metadata: { month, year, totals: { totalBilled: closing.totalBilled, totalCollected: closing.totalCollected } },
  });
  return success(res, publicDoc(closing), "Month closed successfully");
});

export const reopenMonth = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const month = Number(req.body.month) || new Date().getMonth() + 1;
  const year = Number(req.body.year) || new Date().getFullYear();
  const closing = await MonthClosing.findOne({ societyId: sid, billingMonth: month, billingYear: year });
  if (!closing) throw AppError.notFound("Month closing not found", "MONTH_CLOSING_NOT_FOUND");
  if (closing.status !== "CLOSED") throw AppError.badRequest("Month is not closed", "MONTH_NOT_CLOSED");
  closing.status = "REOPENED";
  closing.reopenedAt = new Date();
  closing.reopenedBy = new Types.ObjectId(req.user!.id);
  closing.notes = req.body.notes ?? closing.notes;
  await closing.save();
  await writeAudit({
    userId: req.user!.id,
    societyId: sid,
    action: "month.reopened",
    entity: "MonthClosing",
    entityId: String(closing._id),
    metadata: { month, year, reason: req.body.notes },
  });
  return success(res, publicDoc(closing), "Month reopened");
});
