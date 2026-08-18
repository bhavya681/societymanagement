import { Request, Response } from "express";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { RequestActivity } from "../models/RequestActivity";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { assertResidentOwn, escapeRegex, societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { isAdminLike } from "../middleware/role";
import { writeAudit } from "../services/audit.service";

async function logActivity(input: {
  societyId: string;
  requestId: string;
  actorId: string;
  actorName: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  message?: string;
}) {
  await RequestActivity.create(input);
}

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "createdAt");
  const filter: Record<string, unknown> = { societyId: sid };
  if (!isAdminLike(req.user!.role)) filter.createdBy = req.user!.id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), "i");
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }
  const [rows, total] = await Promise.all([
    MaintenanceRequest.find(filter)
      .populate("createdBy", "name flatId")
      .populate("assignedTo", "name role")
      .populate("flatId", "flatNumber")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    MaintenanceRequest.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const getRequest = asyncHandler(async (req: Request, res: Response) => {
  const doc = await MaintenanceRequest.findOne({ _id: req.params.id, societyId: societyId(req) })
    .populate("createdBy", "name email")
    .populate("assignedTo", "name role")
    .populate("flatId", "flatNumber");
  if (!doc) throw AppError.notFound("Request not found", "REQUEST_NOT_FOUND");
  assertResidentOwn(doc.createdBy, req);
  const activities = await RequestActivity.find({ requestId: doc._id }).sort({ createdAt: 1 });
  const payload = publicDoc(doc) as Record<string, unknown>;
  if (!isAdminLike(req.user!.role)) {
    payload.comments = (doc.comments ?? []).filter((c) => !c.isInternal);
  }
  payload.activities = activities.map(publicDoc);
  return success(res, payload);
});

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const doc = await MaintenanceRequest.create({
    societyId: societyId(req),
    flatId: req.user!.flatId || null,
    createdBy: req.user!.id,
    title: req.body.title,
    category: req.body.category,
    description: req.body.description,
    priority: req.body.priority ?? "MEDIUM",
    location: req.body.location ?? "",
    status: "OPEN",
  });
  await logActivity({
    societyId: societyId(req),
    requestId: String(doc._id),
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "created",
    toStatus: "OPEN",
    message: "Request created",
  });
  return created(res, publicDoc(doc), "Maintenance request submitted");
});

export const updateRequest = asyncHandler(async (req: Request, res: Response) => {
  const doc = await MaintenanceRequest.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!doc) throw AppError.notFound("Request not found", "REQUEST_NOT_FOUND");
  if (!isAdminLike(req.user!.role)) {
    throw AppError.forbidden("Only administrators can update request workflow");
  }
  if (["CLOSED", "REJECTED"].includes(doc.status) && req.body.status && req.body.status !== doc.status) {
    if (!["CLOSED", "REJECTED"].includes(req.body.status) && req.body.status !== doc.status) {
      throw AppError.badRequest("Closed or rejected requests cannot be reopened without authorization", "REQUEST_LOCKED");
    }
  }
  const from = doc.status;
  if (req.body.priority) doc.priority = req.body.priority;
  if (req.body.status) {
    doc.status = req.body.status;
    if (req.body.status === "RESOLVED" || req.body.status === "CLOSED") {
      doc.resolvedAt = doc.resolvedAt ?? new Date();
    }
  }
  await doc.save();
  if (req.body.status && req.body.status !== from) {
    await logActivity({
      societyId: societyId(req),
      requestId: String(doc._id),
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: "status_changed",
      fromStatus: from,
      toStatus: doc.status,
      message: `Status changed to ${doc.status}`,
    });
  }
  return success(res, publicDoc(doc), "Request updated");
});

export const commentOnRequest = asyncHandler(async (req: Request, res: Response) => {
  const doc = await MaintenanceRequest.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!doc) throw AppError.notFound("Request not found", "REQUEST_NOT_FOUND");
  if (!isAdminLike(req.user!.role)) assertResidentOwn(doc.createdBy, req);
  const isInternal = Boolean(req.body.isInternal) && isAdminLike(req.user!.role);
  doc.comments.push({
    authorId: req.user!.id,
    authorName: req.user!.name,
    message: req.body.message,
    isInternal,
    createdAt: new Date(),
  });
  await doc.save();
  await logActivity({
    societyId: societyId(req),
    requestId: String(doc._id),
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "comment_added",
    message: isInternal ? "Internal note added" : "Comment added",
  });
  return created(res, publicDoc(doc), "Comment added");
});

export const assignRequest = asyncHandler(async (req: Request, res: Response) => {
  const doc = await MaintenanceRequest.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!doc) throw AppError.notFound("Request not found", "REQUEST_NOT_FOUND");
  const assignee = await User.findOne({ _id: req.body.assignedTo, societyId: societyId(req) });
  if (!assignee) throw AppError.notFound("Assignee not found", "USER_NOT_FOUND");
  if (assignee.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot assign to an inactive user", "ASSIGNEE_INACTIVE");
  }
  const from = doc.status;
  doc.assignedTo = assignee._id;
  if (doc.status === "OPEN") doc.status = "ASSIGNED";
  await doc.save();
  await logActivity({
    societyId: societyId(req),
    requestId: String(doc._id),
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "assigned",
    fromStatus: from,
    toStatus: doc.status,
    message: `Assigned to ${assignee.name}`,
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "request.assigned",
    entity: "MaintenanceRequest",
    entityId: String(doc._id),
    metadata: { assignedTo: assignee.email },
  });
  return success(res, publicDoc(doc), "Request assigned");
});
