import { describe, expect, it } from "vitest";
import { cancelReservationSchema, createReservationSchema } from "@/modules/reservations/reservation.schema";

const resourceId = "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11";
const inDays = (days: number, hour: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

describe("createReservationSchema", () => {
  it("parses a valid payload into Date objects", () => {
    const result = createReservationSchema.parse({
      resourceId,
      bookedBy: " Alan Turing ",
      startTime: inDays(1, 9),
      endTime: inDays(1, 10),
    });
    expect(result.bookedBy).toBe("Alan Turing");
    expect(result.purpose).toBeNull();
    expect(result.startTime).toBeInstanceOf(Date);
  });

  it("requires an explicit timezone offset", () => {
    const result = createReservationSchema.safeParse({
      resourceId,
      bookedBy: "Alan Turing",
      startTime: "2030-01-01T09:00:00",
      endTime: "2030-01-01T10:00:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields such as status", () => {
    const result = createReservationSchema.safeParse({
      resourceId,
      bookedBy: "Alan Turing",
      startTime: inDays(1, 9),
      endTime: inDays(1, 10),
      status: "CANCELLED",
    });
    expect(result.success).toBe(false);
  });
});

describe("cancelReservationSchema", () => {
  it("accepts an optional reason and normalises blanks to null", () => {
    expect(cancelReservationSchema.parse({})).toEqual({ reason: null });
    expect(cancelReservationSchema.parse({ reason: "  " })).toEqual({ reason: null });
    expect(cancelReservationSchema.parse({ reason: "Meeting moved" })).toEqual({ reason: "Meeting moved" });
    expect(cancelReservationSchema.safeParse({ reason: "x".repeat(301) }).success).toBe(false);
  });
});
