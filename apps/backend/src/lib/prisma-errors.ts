import { Prisma } from "@/generated/prisma/client";

/**
 * Helpers to recognise specific database errors so services can translate
 * them into meaningful API errors (e.g. 409) instead of generic 500s.
 */

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/** True when `error` (or its cause chain) mentions the named database constraint. */
export function mentionsConstraint(error: unknown, constraintName: string): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (JSON.stringify(serialise(current)).includes(constraintName)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function serialise(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, meta: (value as { meta?: unknown }).meta };
  }
  return value;
}
