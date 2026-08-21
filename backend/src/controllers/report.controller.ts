import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import { societyId } from "../utils/access";
import {
  cashFlowReport,
  expenseReport,
  financialSummary,
  maintenanceCollectionReport,
  requestReport,
  residentPaymentReport,
  agingReport,
} from "../services/report.service";

export const financialReport = asyncHandler(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await financialSummary(societyId(req), from, to);
  return success(res, data);
});

export const maintenanceReport = asyncHandler(async (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = await maintenanceCollectionReport(societyId(req), year);
  return success(res, data);
});

export const expensesReport = asyncHandler(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await expenseReport(societyId(req), from, to);
  return success(res, data);
});

export const requestsReport = asyncHandler(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await requestReport(societyId(req), from, to);
  return success(res, data);
});

export const residentsReport = asyncHandler(async (req: Request, res: Response) => {
  const data = await residentPaymentReport(societyId(req));
  return success(res, data);
});

export const cashFlow = asyncHandler(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await cashFlowReport(societyId(req), from, to);
  return success(res, data);
});

export const aging = asyncHandler(async (req: Request, res: Response) => {
  const data = await agingReport(societyId(req));
  return success(res, data);
});
