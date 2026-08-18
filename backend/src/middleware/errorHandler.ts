import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`, "ROUTE_NOT_FOUND"));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      details: err.details,
    });
  }

  const mongoErr = err as { code?: number; keyPattern?: Record<string, number>; message?: string };
  if (mongoErr?.code === 11000) {
    const fields = Object.keys(mongoErr.keyPattern ?? {});
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${fields.join(", ") || "a unique field"}`,
      errorCode: "DUPLICATE_KEY",
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: env.isProd ? "Internal server error" : (err as Error).message || "Internal server error",
    errorCode: "INTERNAL_ERROR",
  });
}
