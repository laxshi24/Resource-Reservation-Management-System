import { dateInZone, isValidDateString, isValidTimeZone } from "@rrms/shared";
import { z } from "zod";

export const dashboardQuerySchema = z
  .object({
    /** IANA timezone that defines where the selected calendar day starts and ends. */
    timeZone: z.string().default("UTC").refine(isValidTimeZone, "timeZone must be an IANA timezone, e.g. Asia/Colombo"),
    /** Calendar day (YYYY-MM-DD) in `timeZone`; defaults to today there. */
    date: z.string().refine(isValidDateString, "date must be a valid YYYY-MM-DD date").optional(),
  })
  .transform((value) => ({ timeZone: value.timeZone, date: value.date ?? dateInZone(new Date(), value.timeZone) }));

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;
