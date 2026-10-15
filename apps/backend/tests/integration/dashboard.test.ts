import type { ApiSuccess, DashboardDto } from "@rrms/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { createCategory, createReservation as seed, createResource, futureHour, resetDatabase } from "../fixtures/db";
import { makeRequest, readBody } from "../fixtures/http";

async function dashboard(query: string) {
  const response = await getDashboard(makeRequest(`/api/dashboard${query}`));
  expect(response.status).toBe(200);
  return (await readBody<ApiSuccess<DashboardDto>>(response)).data;
}

describe("GET /api/dashboard", () => {
  beforeEach(resetDatabase);

  it("returns counts that match the database records", async () => {
    const rooms = await createCategory({ name: "Rooms" });
    const cars = await createCategory({ name: "Cars" });
    const room = await createResource({ categoryId: rooms.id });
    await createResource({ categoryId: rooms.id });
    await createResource({ categoryId: cars.id, isActive: false });

    const day = futureHour(2, 0).toISOString().slice(0, 10);
    await seed({ resourceId: room.id, startTime: futureHour(2, 9), endTime: futureHour(2, 10) });
    await seed({ resourceId: room.id, startTime: futureHour(2, 11), endTime: futureHour(2, 12) });
    await seed({ resourceId: room.id, startTime: futureHour(2, 13), endTime: futureHour(2, 14), status: "CANCELLED" });
    await seed({ resourceId: room.id, startTime: futureHour(5, 9), endTime: futureHour(5, 10) });
    await seed({ resourceId: room.id, startTime: futureHour(-3, 9), endTime: futureHour(-3, 10) });

    const data = await dashboard(`?date=${day}&timeZone=UTC`);
    expect(data.date).toBe(day);
    expect(data.totals).toEqual({
      activeResources: 2,
      inactiveResources: 1,
      reservationsOnDate: 2, // confirmed only
      upcomingConfirmed: 3,
      cancelledTotal: 1,
      availableNow: 2, // no booking covers "now"
      totalUsers: 3, // the standard test accounts
    });
    expect(data.categoryBreakdown).toEqual([
      expect.objectContaining({ name: "Cars", activeResources: 0 }),
      expect.objectContaining({ name: "Rooms", activeResources: 2 }),
    ]);
    expect(data.todaysReservations).toHaveLength(2);
    expect(data.upcomingReservations).toHaveLength(3);
    expect(data.recentReservations).toHaveLength(5);
  });

  it("uses the timezone to decide which bookings fall on the selected day", async () => {
    const resource = await createResource();
    // 20:00 UTC is already the next calendar day in Colombo (UTC+05:30).
    await seed({ resourceId: resource.id, startTime: futureHour(2, 20), endTime: futureHour(2, 21) });
    const utcDay = futureHour(2, 0).toISOString().slice(0, 10);
    const nextDay = futureHour(3, 0).toISOString().slice(0, 10);

    expect((await dashboard(`?date=${utcDay}&timeZone=UTC`)).totals.reservationsOnDate).toBe(1);
    expect((await dashboard(`?date=${utcDay}&timeZone=Asia/Colombo`)).totals.reservationsOnDate).toBe(0);
    expect((await dashboard(`?date=${nextDay}&timeZone=Asia/Colombo`)).totals.reservationsOnDate).toBe(1);
  });

  it("validates date and timezone", async () => {
    for (const query of ["?date=2026-02-30", "?timeZone=Mars/Base", "?date=tomorrow"]) {
      const response = await getDashboard(makeRequest(`/api/dashboard${query}`));
      expect(response.status, query).toBe(400);
    }
    expect((await dashboard("")).timeZone).toBe("UTC");
  });
});
