import { describe, expect, it } from "vitest";
import { blockingOverlapWhere, intervalsOverlap } from "@/modules/reservations/reservation-overlap";

const at = (hhmm: string) => new Date(`2030-01-01T${hhmm}:00Z`);
const interval = (start: string, end: string) => ({ start: at(start), end: at(end) });

describe("intervalsOverlap (half-open [start, end))", () => {
  const existing = interval("09:00", "11:00");

  it.each([
    ["identical", interval("09:00", "11:00")],
    ["overlaps the start", interval("08:00", "09:30")],
    ["overlaps the end", interval("10:30", "12:00")],
    ["inside", interval("09:30", "10:00")],
    ["surrounding", interval("08:00", "12:00")],
  ])("detects %s", (_label, candidate) => {
    expect(intervalsOverlap(candidate, existing)).toBe(true);
    expect(intervalsOverlap(existing, candidate)).toBe(true); // symmetric
  });

  it.each([
    ["ends exactly when the other starts", interval("08:00", "09:00")],
    ["starts exactly when the other ends", interval("11:00", "12:00")],
    ["entirely before", interval("06:00", "07:00")],
    ["entirely after", interval("13:00", "14:00")],
  ])("allows %s", (_label, candidate) => {
    expect(intervalsOverlap(candidate, existing)).toBe(false);
  });
});

describe("blockingOverlapWhere", () => {
  it("builds the strict-inequality filter and only considers confirmed bookings", () => {
    const where = blockingOverlapWhere(interval("09:00", "10:00"));
    expect(where).toEqual({
      status: { in: ["CONFIRMED"] },
      startTime: { lt: at("10:00") },
      endTime: { gt: at("09:00") },
    });
  });
});
