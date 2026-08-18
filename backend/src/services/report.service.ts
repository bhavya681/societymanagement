import { Types } from "mongoose";
import { Bill } from "../models/Bill";
import { Expense } from "../models/Expense";
import { Payment } from "../models/Payment";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { paiseToRupees } from "../utils/money";

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export async function financialSummary(societyId: string, from?: Date, to?: Date) {
  const sid = new Types.ObjectId(societyId);
  const billMatch: Record<string, unknown> = { societyId: sid, status: { $ne: "CANCELLED" } };
  const payMatch: Record<string, unknown> = { societyId: sid, status: "SUCCESS" };
  const expMatch: Record<string, unknown> = { societyId: sid, status: { $ne: "CANCELLED" } };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    billMatch.createdAt = range;
    payMatch.paymentDate = range;
    expMatch.expenseDate = range;
  }

  const [billed] = await Bill.aggregate([
    { $match: billMatch },
    {
      $group: {
        _id: null,
        totalBilled: { $sum: "$totalAmount" },
        totalPaid: { $sum: "$paidAmount" },
        penalties: { $sum: "$penalty" },
      },
    },
  ]);

  const [collected] = await Payment.aggregate([
    { $match: payMatch },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const [expenses] = await Expense.aggregate([
    { $match: expMatch },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const overdueBills = await Bill.aggregate([
    { $match: { societyId: sid, status: { $in: ["OVERDUE", "PENDING", "PARTIALLY_PAID"] } } },
    {
      $group: {
        _id: "$status",
        amount: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalBilled = billed?.totalBilled ?? 0;
  const totalCollected = collected?.total ?? 0;
  const totalExpenses = expenses?.total ?? 0;
  const outstanding = Math.max(0, totalBilled - totalCollected);
  const overdue = overdueBills.find((row) => row._id === "OVERDUE")?.amount ?? 0;
  const pending = overdueBills
    .filter((row) => row._id === "PENDING" || row._id === "PARTIALLY_PAID")
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    totalBilled: paiseToRupees(totalBilled),
    totalCollected: paiseToRupees(totalCollected),
    totalPending: paiseToRupees(pending),
    totalOverdue: paiseToRupees(overdue),
    totalExpenses: paiseToRupees(totalExpenses),
    currentBalance: paiseToRupees(totalCollected - totalExpenses),
    penaltiesCollected: paiseToRupees(billed?.penalties ?? 0),
    outstanding: paiseToRupees(outstanding),
    collectionPercentage: totalBilled === 0 ? 0 : Math.round((totalCollected / totalBilled) * 1000) / 10,
  };
}

export async function monthlyCollection(societyId: string, year: number) {
  const sid = new Types.ObjectId(societyId);
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const rows = await Payment.aggregate([
    { $match: { societyId: sid, status: "SUCCESS", paymentDate: { $gte: start, $lt: end } } },
    { $group: { _id: { $month: "$paymentDate" }, total: { $sum: "$amount" } } },
  ]);
  const expRows = await Expense.aggregate([
    { $match: { societyId: sid, status: { $ne: "CANCELLED" }, expenseDate: { $gte: start, $lt: end } } },
    { $group: { _id: { $month: "$expenseDate" }, total: { $sum: "$amount" } } },
  ]);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((name, idx) => ({
    month: name,
    collection: paiseToRupees(rows.find((r) => r._id === idx + 1)?.total ?? 0),
    expenses: paiseToRupees(expRows.find((r) => r._id === idx + 1)?.total ?? 0),
  }));
}

export async function expensesByCategory(societyId: string, from?: Date, to?: Date) {
  const match: Record<string, unknown> = {
    societyId: new Types.ObjectId(societyId),
    status: { $ne: "CANCELLED" },
  };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    match.expenseDate = range;
  }
  const rows = await Expense.aggregate([
    { $match: match },
    { $group: { _id: "$category", amount: { $sum: "$amount" } } },
    { $sort: { amount: -1 } },
  ]);
  return rows.map((row) => ({ category: row._id, amount: paiseToRupees(row.amount) }));
}

export async function paymentStatusBreakdown(societyId: string) {
  const rows = await Bill.aggregate([
    { $match: { societyId: new Types.ObjectId(societyId), status: { $ne: "CANCELLED" } } },
    { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } }, billed: { $sum: "$totalAmount" } } },
  ]);
  return rows.map((row) => ({
    status: row._id,
    count: row.count,
    outstanding: paiseToRupees(row.amount),
    billed: paiseToRupees(row.billed),
  }));
}

export async function maintenanceCollectionReport(societyId: string, year: number) {
  const sid = new Types.ObjectId(societyId);
  const rows = await Bill.aggregate([
    { $match: { societyId: sid, billingYear: year, status: { $ne: "CANCELLED" } } },
    {
      $group: {
        _id: "$billingMonth",
        totalBilled: { $sum: "$totalAmount" },
        totalCollected: { $sum: "$paidAmount" },
        overdue: {
          $sum: {
            $cond: [{ $eq: ["$status", "OVERDUE"] }, { $subtract: ["$totalAmount", "$paidAmount"] }, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => ({
    month: row._id,
    totalBilled: paiseToRupees(row.totalBilled),
    totalCollected: paiseToRupees(row.totalCollected),
    outstanding: paiseToRupees(row.totalBilled - row.totalCollected),
    overdue: paiseToRupees(row.overdue),
  }));
}

export async function expenseReport(societyId: string, from?: Date, to?: Date) {
  const match: Record<string, unknown> = {
    societyId: new Types.ObjectId(societyId),
    status: { $ne: "CANCELLED" },
  };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    match.expenseDate = range;
  }
  const rows = await Expense.find(match).sort({ expenseDate: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    category: row.category,
    amount: paiseToRupees(row.amount),
    vendor: row.vendor,
    month: new Date(row.expenseDate).getMonth() + 1,
    year: new Date(row.expenseDate).getFullYear(),
    expenseDate: row.expenseDate,
    status: row.status,
  }));
}

export async function residentPaymentReport(societyId: string) {
  const rows = await Bill.aggregate([
    { $match: { societyId: new Types.ObjectId(societyId), status: { $ne: "CANCELLED" } } },
    {
      $group: {
        _id: { residentId: "$residentId", flatId: "$flatId" },
        totalBilled: { $sum: "$totalAmount" },
        paid: { $sum: "$paidAmount" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.residentId",
        foreignField: "_id",
        as: "resident",
      },
    },
    {
      $lookup: {
        from: "flats",
        localField: "_id.flatId",
        foreignField: "_id",
        as: "flat",
      },
    },
  ]);
  return rows.map((row) => ({
    resident: row.resident[0]?.name ?? "Unassigned",
    email: row.resident[0]?.email ?? "",
    flat: row.flat[0]?.flatNumber ?? "",
    totalBilled: paiseToRupees(row.totalBilled),
    paid: paiseToRupees(row.paid),
    outstanding: paiseToRupees(row.totalBilled - row.paid),
  }));
}

export async function requestReport(societyId: string, from?: Date, to?: Date) {
  const match: Record<string, unknown> = { societyId: new Types.ObjectId(societyId) };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    match.createdAt = range;
  }
  const [counts] = await MaintenanceRequest.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$status", "OPEN"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $in: ["$status", ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"]] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] } },
        avgResolutionMs: {
          $avg: {
            $cond: [
              { $ifNull: ["$resolvedAt", false] },
              { $subtract: ["$resolvedAt", "$createdAt"] },
              null,
            ],
          },
        },
      },
    },
  ]);
  return {
    total: counts?.total ?? 0,
    open: counts?.open ?? 0,
    inProgress: counts?.inProgress ?? 0,
    resolved: counts?.resolved ?? 0,
    closed: counts?.closed ?? 0,
    averageResolutionHours: counts?.avgResolutionMs
      ? Math.round((counts.avgResolutionMs / (1000 * 60 * 60)) * 10) / 10
      : 0,
  };
}

export { monthRange };
