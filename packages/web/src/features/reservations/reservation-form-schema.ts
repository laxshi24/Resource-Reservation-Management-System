import { FIELD_LIMITS, RESERVATION_RULES, zonedLocalToUtcIso, type CreateReservationRequest } from "@rrms/shared";
import { z } from "zod";
import { APP_TIME_ZONE } from "../../lib/format-date";

const { bookedBy, purpose } = FIELD_LIMITS;

/**
 * Booking form validation. Start/end are wall-clock values from
 * <input type="datetime-local"> interpreted in the APP timezone, then sent to
 * the API as UTC instants. The backend re-validates everything.
 */
export function createReservationFormSchema(now: () => Date = () => new Date()) {
  return z
    .object({
      resourceId: z.string().min(1, "Please choose a resource"),
      bookedBy: z
        .string()
        .trim()
        .min(bookedBy.min, `Your name must be at least ${bookedBy.min} characters`)
        .max(bookedBy.max, `Your name must be at most ${bookedBy.max} characters`),
      purpose: z.string().trim().max(purpose.max, `Purpose must be at most ${purpose.max} characters`),
      start: z.string().min(1, "Choose a start date and time"),
      end: z.string().min(1, "Choose an end date and time"),
    })
    .superRefine((values, ctx) => {
      const startIso = zonedLocalToUtcIso(values.start, APP_TIME_ZONE);
      const endIso = zonedLocalToUtcIso(values.end, APP_TIME_ZONE);
      if (values.start && !startIso) ctx.addIssue({ code: "custom", path: ["start"], message: "Enter a valid start date and time" });
      if (values.end && !endIso) ctx.addIssue({ code: "custom", path: ["end"], message: "Enter a valid end date and time" });
      if (!startIso || !endIso) return;

      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      const minutes = (end - start) / 60_000;
      if (end <= start) {
        ctx.addIssue({ code: "custom", path: ["end"], message: "End time must be later than start time" });
      } else if (minutes < RESERVATION_RULES.minDurationMinutes) {
        ctx.addIssue({ code: "custom", path: ["end"], message: `A reservation must last at least ${RESERVATION_RULES.minDurationMinutes} minutes` });
      } else if (minutes > RESERVATION_RULES.maxDurationMinutes) {
        ctx.addIssue({ code: "custom", path: ["end"], message: `A reservation cannot be longer than ${RESERVATION_RULES.maxDurationMinutes / 1440} days` });
      }
      if (start < now().getTime() - RESERVATION_RULES.pastStartToleranceMinutes * 60_000) {
        ctx.addIssue({ code: "custom", path: ["start"], message: "Start time cannot be in the past" });
      }
    });
}

export type ReservationFormValues = z.infer<ReturnType<typeof createReservationFormSchema>>;

export function toReservationRequest(values: ReservationFormValues): CreateReservationRequest {
  return {
    resourceId: values.resourceId,
    bookedBy: values.bookedBy.trim(),
    purpose: values.purpose.trim() || null,
    startTime: zonedLocalToUtcIso(values.start, APP_TIME_ZONE)!,
    endTime: zonedLocalToUtcIso(values.end, APP_TIME_ZONE)!,
  };
}
