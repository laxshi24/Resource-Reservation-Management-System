import { z } from "zod";
import { ApiError } from "./api-error";

/** Optional free-text field: trims, treats "" as null, enforces a max length. */
export function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value ? value : null));
}

export const uuidSchema = z.uuid({ error: "Must be a valid UUID" });

/** Validates a route `:id` parameter, returning 404 (not 400) for malformed ids. */
export function parseIdParam(id: string, notFound: ApiError): string {
  const result = uuidSchema.safeParse(id);
  if (!result.success) throw notFound;
  return result.data;
}

/** Runs a Zod schema and converts failures into a 400 ApiError. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown, message?: string): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw ApiError.fromZod(result.error, message);
  return result.data;
}
