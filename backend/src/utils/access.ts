import { Types } from "mongoose";
import { Request } from "express";
import { AppError } from "./AppError";
import { isAdminLike } from "../middleware/role";

export function societyId(req: Request): string {
  if (!req.user?.societyId) throw AppError.unauthorized();
  return req.user.societyId;
}

export function oid(id: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest("Invalid id", "INVALID_ID");
  return new Types.ObjectId(id);
}

export function assertSociety(resourceSocietyId: unknown, req: Request) {
  if (String(resourceSocietyId) !== req.user?.societyId) {
    throw AppError.forbidden("Cross-society access is not allowed", "SOCIETY_ISOLATION");
  }
}

export function refId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return String(value);
}

export function assertResidentOwn(ownerId: unknown, req: Request) {
  if (isAdminLike(req.user!.role)) return;
  if (refId(ownerId) !== req.user!.id) {
    throw AppError.forbidden("You can only access your own records", "RESIDENT_SCOPE");
  }
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
