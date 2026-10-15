import { describe, expect, it } from "vitest";
import {
  dateInZone,
  isValidDateString,
  isValidTimeZone,
  utcToZonedLocalInput,
  zonedDayRange,
  zonedLocalToUtcIso,
} from "../src/time";

describe("time helpers", () => {
  it("validates IANA timezones", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Asia/Colombo")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("validates calendar dates", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-2-3")).toBe(false);
  });

  it("converts wall-clock time in a zone to UTC", () => {
    expect(zonedLocalToUtcIso("2026-10-15T09:30", "UTC")).toBe("2026-10-15T09:30:00.000Z");
    // Colombo is UTC+05:30 all year.
    expect(zonedLocalToUtcIso("2026-10-15T09:30", "Asia/Colombo")).toBe("2026-10-15T04:00:00.000Z");
    // New York is UTC-04:00 in summer.
    expect(zonedLocalToUtcIso("2026-07-01T08:00", "America/New_York")).toBe("2026-07-01T12:00:00.000Z");
    expect(zonedLocalToUtcIso("not-a-date", "UTC")).toBeNull();
    expect(zonedLocalToUtcIso("2026-02-30T10:00", "UTC")).toBeNull();
  });

  it("converts UTC back to wall-clock time (round trip)", () => {
    const iso = "2026-10-15T04:00:00.000Z";
    expect(utcToZonedLocalInput(iso, "Asia/Colombo")).toBe("2026-10-15T09:30");
    expect(zonedLocalToUtcIso(utcToZonedLocalInput(iso, "Asia/Colombo"), "Asia/Colombo")).toBe(iso);
    expect(dateInZone("2026-10-15T20:00:00.000Z", "Asia/Colombo")).toBe("2026-10-16");
  });

  it("computes day ranges including DST transition days", () => {
    const utcDay = zonedDayRange("2026-10-15", "UTC");
    expect(utcDay.start.toISOString()).toBe("2026-10-15T00:00:00.000Z");
    expect(utcDay.end.toISOString()).toBe("2026-10-16T00:00:00.000Z");

    // 2026-03-08 is the US spring-forward day: only 23 hours long.
    const dstDay = zonedDayRange("2026-03-08", "America/New_York");
    expect(dstDay.end.getTime() - dstDay.start.getTime()).toBe(23 * 60 * 60 * 1000);
  });
});
