import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.flatten();
      return next(AppError.badRequest("Validation failed", "VALIDATION_ERROR", details));
    }
    req[source] = result.data as typeof req.body;
    next();
  };
}
