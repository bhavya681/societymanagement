import { NextFunction, Request, Response } from "express";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearer || req.cookies?.token;
    if (!token) {
      throw AppError.unauthorized();
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    if (!user) throw AppError.unauthorized("User no longer exists", "USER_NOT_FOUND");
    if (user.status !== "ACTIVE") {
      throw AppError.forbidden("Account is not active", "ACCOUNT_INACTIVE");
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      societyId: String(user.societyId),
      flatId: user.flatId ? String(user.flatId) : null,
      name: user.name,
      email: user.email,
      status: user.status,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(AppError.unauthorized("Invalid or expired token", "INVALID_TOKEN"));
  }
}
