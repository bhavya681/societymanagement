import { Request, Response } from "express";
import { Bill } from "../models/Bill";
import { Payment } from "../models/Payment";
import { Expense } from "../models/Expense";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { Announcement } from "../models/Announcement";
import { AnnouncementRead } from "../models/AnnouncementRead";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import { societyId } from "../utils/access";
import { publicDoc } from "../utils/serialize";
import { paiseToRupees } from "../utils/money";
import {
  expensesByCategory,
  financialSummary,
  monthlyCollection,
  paymentStatusBreakdown,
} from "../services/report.service";
import { refreshBillStatus } from "../services/billing.service";
import { Society } from "../models/Society";
import { PenaltyConfig } from "../services/penalty.service";

export const adminDashboard = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const society = await Society.findById(sid);
  const overdueCandidates = await Bill.find({
    societyId: sid,
    status: { $in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
  }).limit(200);
  for (const bill of overdueCandidates) {
    await refreshBillStatus(bill._id, society?.penaltyConfig as PenaltyConfig);
  }

  const year = Number(req.query.year) || new Date().getFullYear();
  const [totals, monthly, categories, paymentStatus, recentPayments, recentRequests, recentAnnouncements, openRequests, residentCount] =
    await Promise.all([
      financialSummary(sid),
      monthlyCollection(sid, year),
      expensesByCategory(sid),
      paymentStatusBreakdown(sid),
      Payment.find({ societyId: sid, status: "SUCCESS" })
        .populate("residentId", "name")
        .populate("flatId", "flatNumber")
        .sort({ paymentDate: -1 })
        .limit(6),
      MaintenanceRequest.find({ societyId: sid }).populate("createdBy", "name").sort({ createdAt: -1 }).limit(6),
      Announcement.find({ societyId: sid }).sort({ publishDate: -1 }).limit(5),
      MaintenanceRequest.countDocuments({
        societyId: sid,
        status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"] },
      }),
      User.countDocuments({ societyId: sid, role: "RESIDENT", status: "ACTIVE" }),
    ]);

  return success(res, {
    totals: { ...totals, openRequests, residentCount },
    collectionSummary: monthly,
    expenseSummary: categories,
    paymentStatus,
    recentPayments: recentPayments.map(publicDoc),
    recentRequests: recentRequests.map(publicDoc),
    recentAnnouncements: recentAnnouncements.map(publicDoc),
  });
});

export const residentDashboard = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const uid = req.user!.id;
  const society = await Society.findById(sid);
  const bills = await Bill.find({
    societyId: sid,
    residentId: uid,
    status: { $ne: "CANCELLED" },
  }).sort({ dueDate: 1 });
  for (const bill of bills) {
    await refreshBillStatus(bill._id, society?.penaltyConfig as PenaltyConfig);
  }
  const fresh = await Bill.find({ societyId: sid, residentId: uid, status: { $ne: "CANCELLED" } }).sort({ dueDate: 1 });
  const unpaid = fresh.filter((b) => b.status !== "PAID");
  const currentDue = unpaid.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);
  const overdueAmount = unpaid
    .filter((b) => b.status === "OVERDUE")
    .reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);
  const nextDue = unpaid[0];
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const [lastPayment, yearPaid, recentPayments, recentRequests, announcements, reads] = await Promise.all([
    Payment.findOne({ societyId: sid, residentId: uid, status: "SUCCESS" }).sort({ paymentDate: -1 }),
    Payment.aggregate([
      {
        $match: {
          societyId: new (await import("mongoose")).Types.ObjectId(sid),
          residentId: new (await import("mongoose")).Types.ObjectId(uid),
          status: "SUCCESS",
          paymentDate: { $gte: yearStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.find({ societyId: sid, residentId: uid }).sort({ paymentDate: -1 }).limit(5),
    MaintenanceRequest.find({ societyId: sid, createdBy: uid }).sort({ createdAt: -1 }).limit(5),
    Announcement.find({
      societyId: sid,
      status: "PUBLISHED",
      publishDate: { $lte: new Date() },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
    })
      .sort({ pinned: -1, publishDate: -1 })
      .limit(6),
    AnnouncementRead.find({ userId: uid }),
  ]);
  const readSet = new Set(reads.map((r) => String(r.announcementId)));
  return success(res, {
    currentDue: paiseToRupees(currentDue),
    overdueAmount: paiseToRupees(overdueAmount),
    nextDueDate: nextDue?.dueDate ?? null,
    lastPayment: lastPayment ? publicDoc(lastPayment) : null,
    totalPaidThisYear: paiseToRupees(yearPaid[0]?.total ?? 0),
    unpaidBills: unpaid.map(publicDoc),
    recentPayments: recentPayments.map(publicDoc),
    recentRequests: recentRequests.map(publicDoc),
    announcements: announcements.map((a) => ({ ...publicDoc(a), isRead: readSet.has(String(a._id)) })),
    unreadAnnouncementCount: announcements.filter((a) => !readSet.has(String(a._id))).length,
  });
});
