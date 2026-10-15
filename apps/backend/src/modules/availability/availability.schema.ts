import { z } from "zod";
import { uuidSchema } from "@/lib/validation";
import { instantSchema } from "@/modules/reservations/reservation.schema";

/** Longest window that can be searched at once (keeps the query bounded). */
export const MAX_AVAILABILITY_WINDOW_DAYS = 31;

export const availabilityQuerySchema = z
  .object({
    startTime: instantSchema("startTime"),
    endTime: instantSchema("endTime"),
    categoryId: uuidSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!(value.startTime instanceof Date) || !(value.endTime instanceof Date)) return;
    if (value.endTime <= value.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "endTime must be later than startTime" });
    } else if (value.endTime.getTime() - value.startTime.getTime() > MAX_AVAILABILITY_WINDOW_DAYS * 86_400_000) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: `The search window cannot be longer than ${MAX_AVAILABILITY_WINDOW_DAYS} days`,
      });
    }
  });

export type AvailabilityQuery = z.output<typeof availabilityQuerySchema>;
