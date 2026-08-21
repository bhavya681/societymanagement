import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { User } from "../models/User";
import { Flat } from "../models/Flat";
import { Bill } from "../models/Bill";
import { Payment } from "../models/Payment";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { Society } from "../models/Society";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { assertResidentOwn, escapeRegex, oid, societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { AppError } from "../utils/AppError";
import { publicDoc } from "../utils/serialize";
import { writeAudit } from "../services/audit.service";
import { isAdminLike } from "../middleware/role";
import { paiseToRupees } from "../utils/money";

async function attachMaintenanceStatus(society: string, residents: { _id: unknown; flatId?: unknown }[]) {
  const ids = residents.map((r) => r._id);
  const bills = await Bill.aggregate([
    { $match: { societyId: oid(society), residentId: { $in: ids }, status: { $ne: "CANCELLED" } } },
    {
      $group: {
        _id: "$residentId",
        outstanding: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } },
        overdue: {
          $sum: {
            $cond: [{ $eq: ["$status", "OVERDUE"] }, { $subtract: ["$totalAmount", "$paidAmount"] }, 0],
          },
        },
      },
    },
  ]);
  const map = new Map(bills.map((b) => [String(b._id), b]));
  return residents.map((r) => {
    const row = map.get(String(r._id));
    return {
      ...publicDoc(r),
      outstanding: paiseToRupees(row?.outstanding ?? 0),
      overdue: paiseToRupees(row?.overdue ?? 0),
      maintenanceStatus: (row?.overdue ?? 0) > 0 ? "OVERDUE" : (row?.outstanding ?? 0) > 0 ? "PENDING" : "CLEAR",
    };
  });
}

export const listResidents = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "name");
  const filter: Record<string, unknown> = {
    societyId: sid,
    role: { $in: isAdminLike(req.user!.role) ? ["ADMIN", "TREASURER", "ACCOUNTANT", "SECRETARY", "RESIDENT", "COMMITTEE"] : ["RESIDENT", "COMMITTEE"] },
  };
  if (!isAdminLike(req.user!.role)) {
    const society = await Society.findById(sid);
    if (!society?.privacy?.showDirectoryToResidents) {
      throw AppError.forbidden("Resident directory is private", "DIRECTORY_PRIVATE");
    }
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [rows, total] = await Promise.all([
    User.find(filter).populate("flatId", "flatNumber floor ownershipStatus buildingId").sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  let items: Record<string, unknown>[] = await attachMaintenanceStatus(sid, rows);
  if (!isAdminLike(req.user!.role)) {
    const society = await Society.findById(sid);
    items = items.map((item) => {
      const copy = { ...(item as Record<string, unknown>) };
      if (!society?.privacy?.showResidentEmail) delete copy.email;
      if (!society?.privacy?.showResidentPhone) delete copy.phone;
      delete copy.emergencyContactName;
      delete copy.emergencyContactPhone;
      return copy;
    });
  }
  return success(res, paginatedResult(items, total, page, limit));
});

export const getResident = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ _id: req.params.id, societyId: societyId(req) }).populate(
    "flatId",
    "flatNumber floor ownershipStatus",
  );
  if (!user) throw AppError.notFound("Resident not found", "RESIDENT_NOT_FOUND");
  assertResidentOwn(user._id, req);
  return success(res, publicDoc(user));
});

export const createResident = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const exists = await User.findOne({ email: req.body.email.toLowerCase() });
  if (exists) throw AppError.conflict("Email is already registered", "EMAIL_TAKEN");
  if (!req.body.password) {
    throw AppError.badRequest("Password is required for new residents", "PASSWORD_REQUIRED");
  }
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    phone: req.body.phone,
    passwordHash,
    role: req.body.role ?? "RESIDENT",
    status: "ACTIVE",
    societyId: sid,
    flatId: req.body.flatId || null,
    occupancyRole: req.body.occupancyRole ?? "OWNER",
    emergencyContactName: req.body.emergencyContactName ?? "",
    emergencyContactPhone: req.body.emergencyContactPhone ?? "",
  });
  if (req.body.flatId) {
    const flat = await Flat.findOne({ _id: req.body.flatId, societyId: sid });
    if (!flat) throw AppError.notFound("Flat not found", "FLAT_NOT_FOUND");
    if (user.occupancyRole === "OWNER") flat.owner = user._id;
    if (!flat.occupants.map(String).includes(String(user._id))) flat.occupants.push(user._id);
    if (flat.ownershipStatus === "VACANT") {
      flat.ownershipStatus = user.occupancyRole === "OWNER" ? "OWNER_OCCUPIED" : "TENANT_OCCUPIED";
    }
    await flat.save();
  }
  await writeAudit({
    userId: req.user!.id,
    societyId: sid,
    action: "resident.created",
    entity: "User",
    entityId: String(user._id),
    metadata: { email: user.email },
  });
  return created(res, publicDoc(user), "Resident added successfully");
});

export const updateResident = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!user) throw AppError.notFound("Resident not found", "RESIDENT_NOT_FOUND");
  if (!isAdminLike(req.user!.role)) {
    assertResidentOwn(user._id, req);
    if (req.body.name) user.name = req.body.name;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.emergencyContactName !== undefined) user.emergencyContactName = req.body.emergencyContactName;
    if (req.body.emergencyContactPhone !== undefined) user.emergencyContactPhone = req.body.emergencyContactPhone;
    if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
    await user.save();
    return success(res, publicDoc(user), "Profile updated");
  }
  const prevFlat = user.flatId ? String(user.flatId) : null;
  Object.assign(user, {
    ...(req.body.name && { name: req.body.name }),
    ...(req.body.phone && { phone: req.body.phone }),
    ...(req.body.occupancyRole !== undefined && { occupancyRole: req.body.occupancyRole }),
    ...(req.body.emergencyContactName !== undefined && { emergencyContactName: req.body.emergencyContactName }),
    ...(req.body.emergencyContactPhone !== undefined && { emergencyContactPhone: req.body.emergencyContactPhone }),
    ...(req.body.status && { status: req.body.status }),
  });
  if (req.body.flatId !== undefined) user.flatId = req.body.flatId || null;
  await user.save();
  if (req.body.flatId !== undefined && String(req.body.flatId || "") !== prevFlat) {
    if (prevFlat) {
      await Flat.updateOne({ _id: prevFlat }, { $pull: { occupants: user._id } });
    }
    if (req.body.flatId) {
      const flat = await Flat.findOne({ _id: req.body.flatId, societyId: societyId(req) });
      if (flat) {
        if (!flat.occupants.map(String).includes(String(user._id))) flat.occupants.push(user._id);
        if (user.occupancyRole === "OWNER") flat.owner = user._id;
        await flat.save();
      }
    }
  }
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "resident.updated",
    entity: "User",
    entityId: String(user._id),
  });
  return success(res, publicDoc(user), "Resident updated");
});

export const updateResidentStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!user) throw AppError.notFound("Resident not found", "RESIDENT_NOT_FOUND");
  user.status = req.body.status;
  await user.save();
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "resident.status_changed",
    entity: "User",
    entityId: String(user._id),
    metadata: { status: user.status },
  });
  return success(res, publicDoc(user), "Resident status updated");
});

export const resetResidentPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ _id: req.params.id, societyId: societyId(req) }).select("+passwordHash");
  if (!user) throw AppError.notFound("Resident not found", "RESIDENT_NOT_FOUND");
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  await user.save();
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "resident.password_reset",
    entity: "User",
    entityId: String(user._id),
  });
  return success(res, { id: String(user._id) }, "Password reset");
});

export const residentHistory = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const user = await User.findOne({ _id: req.params.id, societyId: sid });
  if (!user) throw AppError.notFound("Resident not found", "RESIDENT_NOT_FOUND");
  assertResidentOwn(user._id, req);
  const [bills, payments, requests] = await Promise.all([
    Bill.find({ societyId: sid, residentId: user._id }).sort({ createdAt: -1 }).limit(50),
    Payment.find({ societyId: sid, residentId: user._id }).sort({ paymentDate: -1 }).limit(50),
    MaintenanceRequest.find({ societyId: sid, createdBy: user._id }).sort({ createdAt: -1 }).limit(50),
  ]);
  return success(res, {
    bills: bills.map(publicDoc),
    payments: payments.map(publicDoc),
    requests: requests.map(publicDoc),
  });
});

export const residentLedger = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const user = await User.findOne({ _id: req.params.id, societyId: sid }).populate("flatId", "flatNumber");
  if (!user) throw AppError.notFound("Resident not found", "RESIDENT_NOT_FOUND");
  const bills = await Bill.find({ societyId: sid, residentId: user._id, status: { $ne: "CANCELLED" } })
    .populate("flatId", "flatNumber")
    .sort({ billingYear: -1, billingMonth: -1 });
  const payments = await Payment.find({ societyId: sid, residentId: user._id, status: "SUCCESS" })
    .sort({ paymentDate: -1 })
    .limit(50);
  const totalCharged = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalPaid = bills.reduce((sum, b) => sum + b.paidAmount, 0);
  const totalPenalty = bills.reduce((sum, b) => sum + b.penalty, 0);
  const outstanding = totalCharged - totalPaid;
  return success(res, {
    resident: publicDoc(user),
    summary: {
      totalCharged,
      totalPaid,
      totalPenalty,
      outstanding,
    },
    bills: bills.map(publicDoc),
    payments: payments.map(publicDoc),
  });
});

export const residentMonthlyLedger = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const uid = req.user!.id;
  const bills = await Bill.find({ societyId: sid, residentId: uid, status: { $ne: "CANCELLED" } })
    .populate("flatId", "flatNumber")
    .sort({ billingYear: -1, billingMonth: -1 });
  const payments = await Payment.find({ societyId: sid, residentId: uid, status: "SUCCESS" }).sort({ paymentDate: -1 });
  const paymentMap = new Map<string, number>();
  for (const p of payments) {
    const key = `${p.billId}`;
    paymentMap.set(key, (paymentMap.get(key) || 0) + p.amount);
  }
  const rows = bills.map((b) => {
    const paid = paymentMap.get(String(b._id)) || b.paidAmount;
    const remaining = Math.max(0, b.totalAmount - paid);
    return {
      id: String(b._id),
      billingMonth: b.billingMonth,
      billingYear: b.billingYear,
      flatNumber: (b.flatId as { flatNumber?: string })?.flatNumber,
      baseAmount: b.baseAmount,
      additionalCharges: b.additionalCharges,
      penalty: b.penalty,
      discount: b.discount,
      totalAmount: b.totalAmount,
      paidAmount: paid,
      remaining,
      status: b.status,
      dueDate: b.dueDate,
    };
  });
  const totalCharged = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalPenalty = rows.reduce((sum, r) => sum + r.penalty, 0);
  return success(res, {
    summary: {
      totalCharged,
      totalPaid,
      totalPenalty,
      outstanding: totalCharged - totalPaid,
    },
    rows,
  });
});
