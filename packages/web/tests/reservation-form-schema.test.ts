import { describe, expect, it } from "vitest";
import { createReservationFormSchema, toReservationRequest } from "../src/features/reservations/reservation-form-schema";

// The app timezone for these tests is Asia/Colombo (UTC+05:30), see vitest.config.mts.
const fixedNow = () => new Date("2030-01-01T00:00:00Z");
const schema = createReservationFormSchema(fixedNow);
const valid = {
  resourceId: "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11",
  bookedBy: "Ada Lovelace",
  purpose: "",
  start: "2030-01-10T09:30",
  end: "2030-01-10T10:30",
};

describe("reservation form schema", () => {
  it("accepts a valid booking", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects an end before the start, too-short and too-long bookings", () => {
    const messages = (values: Partial<typeof valid>) => {
      const result = schema.safeParse({ ...valid, ...values });
      return result.success ? [] : result.error.issues.map((issue) => issue.message);
    };
    expect(messages({ end: "2030-01-10T09:00" })).toContain("End time must be later than start time");
    expect(messages({ end: "2030-01-10T09:40" })[0]).toMatch(/at least 15 minutes/);
    expect(messages({ end: "2030-01-20T09:30" })[0]).toMatch(/longer than 7 days/);
  });

  it("rejects a start in the past and missing fields", () => {
    expect(schema.safeParse({ ...valid, start: "2029-12-31T09:00", end: "2029-12-31T10:00" }).success).toBe(false);
    const result = schema.safeParse({ ...valid, resourceId: "", bookedBy: "A", start: "" });
    expect(result.success).toBe(false);
  });

  it("converts wall-clock times in the app timezone to UTC instants", () => {
    const request = toReservationRequest({ ...valid, bookedBy: "  Ada  ", purpose: "  " });
    expect(request).toEqual({
      resourceId: valid.resourceId,
      bookedBy: "Ada",
      purpose: null,
      startTime: "2030-01-10T04:00:00.000Z",
      endTime: "2030-01-10T05:00:00.000Z",
    });
  });
});
