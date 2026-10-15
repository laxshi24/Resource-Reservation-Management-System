import { prisma } from "@/lib/prisma";
import { createTestAccounts } from "./auth";

/** Removes all rows (keeps the schema), then creates the standard test accounts. */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "reservations", "resources", "resource_categories", "sessions", "users" RESTART IDENTITY CASCADE',
  );
  await createTestAccounts();
}

let counter = 0;
const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}-${++counter}`;

export async function createCategory(overrides: Partial<{ name: string; slug: string }> = {}) {
  const name = overrides.name ?? unique("Category");
  return prisma.resourceCategory.create({
    data: { name, slug: overrides.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
  });
}

export async function createResource(
  overrides: Partial<{ name: string; categoryId: string; isActive: boolean; capacity: number | null; location: string }> = {},
) {
  const categoryId = overrides.categoryId ?? (await createCategory()).id;
  return prisma.resource.create({
    data: {
      name: overrides.name ?? unique("Resource"),
      categoryId,
      isActive: overrides.isActive ?? true,
      capacity: overrides.capacity === undefined ? 4 : overrides.capacity,
      location: overrides.location ?? "Level 1",
    },
  });
}

/**
 * Inserts a reservation directly (bypassing API rules such as "not in the
 * past"), which is handy for arranging historical data.
 */
export async function createReservation(input: {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  status?: "CONFIRMED" | "CANCELLED";
  bookedBy?: string;
  userId?: string | null;
}) {
  const cancelled = input.status === "CANCELLED";
  return prisma.reservation.create({
    data: {
      resourceId: input.resourceId,
      userId: input.userId ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      bookedBy: input.bookedBy ?? "Test User",
      status: input.status ?? "CONFIRMED",
      cancelledAt: cancelled ? new Date() : null,
    },
  });
}

/** A whole hour `days` days from now (UTC). Keeps tests independent of the current date. */
export function futureHour(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}
