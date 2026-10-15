import { describe, expect, it } from "vitest";
import { formatDuration, formatTime, formatTimeRange } from "../src/lib/format-date";
import { getEnumParam, getPageParam, getParam, getUuidParam } from "../src/lib/search-params";

describe("format-date (app timezone Asia/Colombo)", () => {
  it("shows times in the configured timezone, not the machine's", () => {
    expect(formatTime("2030-01-10T04:00:00.000Z")).toBe("09:30");
  });

  it("formats same-day and multi-day ranges", () => {
    expect(formatTimeRange("2030-01-10T04:00:00Z", "2030-01-10T05:00:00Z")).toMatch(/10 Jan 2030 · 09:30–10:30$/);
    expect(formatTimeRange("2030-01-10T04:00:00Z", "2030-01-11T05:00:00Z")).toContain("→");
  });

  it("formats durations", () => {
    expect(formatDuration("2030-01-10T04:00:00Z", "2030-01-10T05:30:00Z")).toBe("1 h 30 min");
    expect(formatDuration("2030-01-10T04:00:00Z", "2030-01-12T04:15:00Z")).toBe("2 d 15 min");
  });
});

describe("search-params helpers", () => {
  it("reads single values safely", () => {
    expect(getParam({ q: ["first", "second"] }, "q")).toBe("first");
    expect(getParam({ q: "  " }, "q")).toBeUndefined();
    expect(getEnumParam({ s: "bogus" }, "s", ["a", "b"] as const, "a")).toBe("a");
    expect(getPageParam({ page: "-3" })).toBe(1);
    expect(getPageParam({ page: "4" })).toBe(4);
    expect(getUuidParam({ id: "not-a-uuid" }, "id")).toBeUndefined();
    expect(getUuidParam({ id: "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11" }, "id")).toBe("0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11");
  });
});
