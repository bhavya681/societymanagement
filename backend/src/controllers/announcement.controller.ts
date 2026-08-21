import { Request, Response } from "express";
import { Announcement } from "../models/Announcement";
import { AnnouncementRead } from "../models/AnnouncementRead";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { isAdminLike } from "../middleware/role";
import { writeAudit } from "../services/audit.service";

function activeFilter() {
  const now = new Date();
  return {
    status: { $in: ["PUBLISHED"] },
    publishDate: { $lte: now },
    $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
  };
}

export const listAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip } = parsePagination(req.query, "publishDate");
  const filter: Record<string, unknown> = { societyId: sid };
  if (!isAdminLike(req.user!.role)) Object.assign(filter, activeFilter());
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status && isAdminLike(req.user!.role)) filter.status = req.query.status;
  const [rows, total] = await Promise.all([
    Announcement.find(filter).populate("createdBy", "name").sort({ pinned: -1, publishDate: -1 }).skip(skip).limit(limit),
    Announcement.countDocuments(filter),
  ]);
  const reads = await AnnouncementRead.find({
    userId: req.user!.id,
    announcementId: { $in: rows.map((r) => r._id) },
  });
  const readSet = new Set(reads.map((r) => String(r.announcementId)));
  const items = rows.map((row) => ({ ...publicDoc(row), isRead: readSet.has(String(row._id)) }));
  return success(res, paginatedResult(items, total, page, limit));
});

export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const doc = await Announcement.create({
    societyId: societyId(req),
    title: req.body.title,
    content: req.body.content,
    category: req.body.category,
    priority: req.body.priority ?? (req.body.important ? "IMPORTANT" : "NORMAL"),
    publishDate: req.body.publishDate ? new Date(req.body.publishDate) : new Date(),
    expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
    createdBy: req.user!.id,
    pinned: req.body.pinned ?? false,
    important: req.body.important ?? (req.body.priority === "IMPORTANT" || req.body.priority === "URGENT"),
    status: req.body.status ?? "PUBLISHED",
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "announcement.created",
    entity: "Announcement",
    entityId: String(doc._id),
  });
  return created(res, publicDoc(doc), "Announcement published");
});

export const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const doc = await Announcement.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!doc) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  const allowed = ["title", "content", "category", "priority", "publishDate", "expiryDate", "pinned", "important", "status"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  Object.assign(doc, update);
  await doc.save();
  return success(res, publicDoc(doc), "Announcement updated");
});

export const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const doc = await Announcement.findOneAndDelete({ _id: req.params.id, societyId: societyId(req) });
  if (!doc) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  await AnnouncementRead.deleteMany({ announcementId: doc._id });
  return success(res, { id: req.params.id }, "Announcement deleted");
});

export const markAnnouncementRead = asyncHandler(async (req: Request, res: Response) => {
  const doc = await Announcement.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!doc) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  await AnnouncementRead.updateOne(
    { announcementId: doc._id, userId: req.user!.id },
    {
      $setOnInsert: {
        societyId: societyId(req),
        announcementId: doc._id,
        userId: req.user!.id,
        readAt: new Date(),
      },
    },
    { upsert: true },
  );
  return success(res, { id: req.params.id, isRead: true }, "Marked as read");
});
