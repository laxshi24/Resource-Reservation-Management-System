import { ERROR_CODES, type ApiErrorBody, type ApiSuccess } from "@rrms/shared";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./api-error";
import { logger } from "./logger";

export function ok<T>(data: T, message?: string, status = 200) {
  const body: ApiSuccess<T> = { success: true, data, ...(message ? { message } : {}) };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T, message?: string) {
  return ok(data, message, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse(ApiError.fromZod(error));
  }
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details?.length ? { details: error.details } : {}),
      },
    };
    return NextResponse.json(body, { status: error.status });
  }

  // Unexpected: log full details server-side, return a generic message to the client.
  logger.error("Unhandled API error", {
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
  });
  const body: ApiErrorBody = {
    success: false,
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An unexpected error occurred. Please try again." },
  };
  return NextResponse.json(body, { status: 500 });
}

/** Wraps a route handler so every thrown error becomes a consistent JSON response. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Parses a JSON request body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, ERROR_CODES.INVALID_JSON, "The request body must be valid JSON.");
  }
}
