import { FIELD_LIMITS, RESERVATION_RULES } from "@rrms/shared";
import { z } from "zod";
import { paginationQuerySchema } from "@/lib/pagination";
import { optionalText, uuidSchema } from "@/lib/validation";

const { bookedBy, purpose, cancellationReason } = FIELD_LIMITS;

/**
 * ISO-8601 instant that MUST carry an explicit offset ("Z" or "+05:30").
 * Strings without an offset are rejected because their meaning would depend on
 * the server's timezone.
 */
export const instantSchema = (label: string) =>
  z.iso
    .datetime({ offset: true, error: `${label} must be an ISO-8601 date-time with a timezone offset, e.g. 2026-10-15T09:00:00Z` })
    .transform((value) => new Date(value));

const bookedBySchema = z
  .string({ error: "Booked by is required" })
  .trim()
  .min(bookedBy.min, `Booked by must be at least ${bookedBy.min} characters`)
  .max(bookedBy.max, `Booked by must be at most ${bookedBy.max} characters`);

/** Rules every reservation interval must satisfy (independent of other bookings). */
export function validateInterval(start: unknown, end: unknown, ctx: z.RefinementCtx, now = new Date()) {
  // Zod 4 still runs object refinements when a field already failed; only check parsed dates.
  if (!(start instanceof Date) || !(end instanceof Date)) return;
  const minutes = (end.getTime() - start.getTime()) / 60_000;
  if (end <= start) {
    ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be later than start time" });
    return;
  }
  if (minutes < RESERVATION_RULES.minDurationMinutes) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: `A reservation must last at least ${RESERVATION_RULES.minDurationMinutes} minutes`,
    });
  }
  if (minutes > RESERVATION_RULES.maxDurationMinutes) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: `A reservation cannot be longer than ${RESERVATION_RULES.maxDurationMinutes / 1440} days`,
    });
  }
  const earliestStart = now.getTime() - RESERVATION_RULES.pastStartToleranceMinutes * 60_000;
  if (start.getTime() < earliestStart) {
    ctx.addIssue({ code: "custom", path: ["startTime"], message: "Start time cannot be in the past" });
  }
}

export const createReservationSchema = z
  .strictObject({
    resourceId: uuidSchema,
    /** Admins may book on behalf of someone; regular users always book under their own name. */
    bookedBy: bookedBySchema.optional(),
    purpose: optionalText(purpose.max, "Purpose"),
    startTime: instantSchema("Start time"),
    endTime: instantSchema("End time"),
  })
  .superRefine((value, ctx) => validateInterval(value.startTime, value.endTime, ctx));

export type CreateReservationInput = z.output<typeof createReservationSchema>;

export const cancelReservationSchema = z.strictObject({
  reason: optionalText(cancellationReason.max, "Reason"),
});

export type CancelReservationInput = z.output<typeof cancelReservationSchema>;

export const updateReservationSchema = z
  .strictObject({
    bookedBy: bookedBySchema.optional(),
    purpose: optionalText(purpose.max, "Purpose").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide bookedBy and/or purpose. Status changes use POST /api/reservations/:id/cancel.",
  });

export type UpdateReservationInput = z.output<typeof updateReservationSchema>;

export const listReservationsQuerySchema = paginationQuerySchema
  .extend({
    resourceId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    status: z.enum(["CONFIRMED", "CANCELLED", "all"]).default("all"),
    /** upcoming = not yet ended, past = already ended. */
    timeframe: z.enum(["upcoming", "past", "all"]).default("all"),
    /** Optional window: reservations overlapping [from, to). */
    from: instantSchema("from").optional(),
    to: instantSchema("to").optional(),
    search: z.string().trim().max(FIELD_LIMITS.search.max).optional(),
    sortBy: z.enum(["startTime", "createdAt"]).default("startTime"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  })
  .superRefine((value, ctx) => {
    if (value.from instanceof Date && value.to instanceof Date && value.to <= value.from) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "to must be later than from" });
    }
  });

export type ListReservationsQuery = z.output<typeof listReservationsQuerySchema>;
