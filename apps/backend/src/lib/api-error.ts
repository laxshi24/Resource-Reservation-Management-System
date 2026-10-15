import { ERROR_CODES, type ErrorCode, type ValidationIssue } from "@rrms/shared";
import type { ZodError } from "zod";

/**
 * An expected, client-facing failure. Services throw it; the route wrapper
 * converts it to a JSON error response with the given HTTP status.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = "ApiError";
  }

  static validation(message: string, details?: ValidationIssue[]) {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static fromZod(error: ZodError, message = "The request contains invalid data.") {
    const details = error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    }));
    return ApiError.validation(message, details);
  }

  static notFound(code: ErrorCode, message: string) {
    return new ApiError(404, code, message);
  }

  static conflict(code: ErrorCode, message: string) {
    return new ApiError(409, code, message);
  }
}
