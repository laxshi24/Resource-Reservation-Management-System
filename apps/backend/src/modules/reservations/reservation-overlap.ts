import { BLOCKING_RESERVATION_STATUSES } from "@rrms/shared";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Double-booking rules, in one place.
 *
 * Reservations are half-open intervals [start, end): the end instant is NOT
 * part of the reservation. Two intervals overlap exactly when
 *
 *     newStart < existingEnd  AND  newEnd > existingStart
 *
 * so a booking ending at 11:00 and another starting at 11:00 can coexist.
 * Only "blocking" statuses (CONFIRMED) count; cancelled bookings never block.
 *
 * The PostgreSQL exclusion constraint `reservations_no_overlap` enforces the
 * same rule inside the database (see the migrations), which is what makes it
 * safe under concurrent requests. This module powers the friendly pre-check,
 * availability search and unit tests.
 */

export interface Interval {
  start: Date;
  end: Date;
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

/** Prisma filter matching reservations that block the given interval. */
export function blockingOverlapWhere(interval: Interval): Prisma.ReservationWhereInput {
  return {
    status: { in: [...BLOCKING_RESERVATION_STATUSES] },
    startTime: { lt: interval.end },
    endTime: { gt: interval.start },
  };
}

/** Name of the database exclusion constraint created in the migrations. */
export const NO_OVERLAP_CONSTRAINT = "reservations_no_overlap";
