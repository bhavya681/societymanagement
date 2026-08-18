export class AppError extends Error {
  statusCode: number;
  errorCode: string;
  details?: unknown;

  constructor(message: string, statusCode = 400, errorCode = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }

  static badRequest(message: string, errorCode = "BAD_REQUEST", details?: unknown) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = "Authentication required", errorCode = "UNAUTHORIZED") {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = "You do not have permission to perform this action", errorCode = "FORBIDDEN") {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = "Resource not found", errorCode = "NOT_FOUND") {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message: string, errorCode = "CONFLICT") {
    return new AppError(message, 409, errorCode);
  }
}
