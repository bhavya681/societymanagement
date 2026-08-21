import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

const ADMIN_LIKE = new Set(["ADMIN", "SECRETARY", "CHAIRMAN", "ACCOUNTANT", "COMMITTEE", "SOCIETY_ADMIN", "TREASURER", "SUPER_ADMIN"]);

export function isAdminLike(role: string): boolean {
  return ADMIN_LIKE.has(role);
}

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  if (!isAdminLike(req.user.role)) return next(AppError.forbidden());
  next();
}

export function requireTreasurerOrAbove(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  const allowed = new Set(["ADMIN", "SOCIETY_ADMIN", "TREASURER", "ACCOUNTANT", "SUPER_ADMIN"]);
  if (!allowed.has(req.user.role)) return next(AppError.forbidden());
  next();
}

export function requireSecretaryOrAbove(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  const allowed = new Set(["ADMIN", "SOCIETY_ADMIN", "SECRETARY", "CHAIRMAN", "SUPER_ADMIN"]);
  if (!allowed.has(req.user.role)) return next(AppError.forbidden());
  next();
}
