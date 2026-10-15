import type { ApiSuccess, AvailabilityDto } from "@rrms/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as getAvailability } from "@/app/api/reservations/availability/route";
import { POST as cancelReservation } from "@/app/api/reservations/[id]/cancel/route";
import { POST as createReservation } from "@/app/api/reservations/route";
import { createCategory, createReservation as seed, createResource, futureHour, resetDatabase } from "../fixtures/db";
import { makeRequest, params, readBody } from "../fixtures/http";

async function availability(start: Date, end: Date, extra = "") {
  const response = await getAvailability(
    makeRequest(`/api/reservations/availability?startTime=${start.toISOString()}&endTime=${end.toISOString()}${extra}`),
  );
  expect(response.status).toBe(200);
  return (await readBody<ApiSuccess<AvailabilityDto>>(response)).data;
}

const stateOf = (data: AvailabilityDto, resourceId: string) =>
  data.items.find((item) => item.resource.id === resourceId)?.state;

describe("GET /api/reservations/availability", () => {
  beforeEach(resetDatabase);

  it("classifies resources as available, occupied or inactive from database records", async () => {
    const free = await createResource({ name: "A Free Room" });
    const busy = await createResource({ name: "B Busy Room" });
    const off = await createResource({ name: "C Closed Room", isActive: false });
    const booking = await seed({ resourceId: busy.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10), bookedBy: "Bob" });

    const data = await availability(futureHour(1, 9, 30), futureHour(1, 11));
    expect(data.summary).toEqual({ total: 3, available: 1, occupied: 1, inactive: 1 });
    expect(data.items.map((item) => item.state)).toEqual(["AVAILABLE", "OCCUPIED", "INACTIVE"]);
    expect(stateOf(data, free.id)).toBe("AVAILABLE");
    expect(stateOf(data, off.id)).toBe("INACTIVE");
    expect(data.items.find((item) => item.resource.id === busy.id)?.conflicts).toEqual([
      { id: booking.id, bookedBy: "Bob", isMine: false, startTime: futureHour(1, 9).toISOString(), endTime: futureHour(1, 10).toISOString() },
    ]);
  });

  it("treats the end time as exclusive at both boundaries", async () => {
    const resource = await createResource();
    await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });

    expect(stateOf(await availability(futureHour(1, 10), futureHour(1, 11)), resource.id)).toBe("AVAILABLE");
    expect(stateOf(await availability(futureHour(1, 8), futureHour(1, 9)), resource.id)).toBe("AVAILABLE");
    expect(stateOf(await availability(futureHour(1, 8), futureHour(1, 9, 1)), resource.id)).toBe("OCCUPIED");
  });

  it("reflects new bookings and cancellations immediately", async () => {
    const resource = await createResource();
    const window = [futureHour(2, 14), futureHour(2, 15)] as const;
    expect(stateOf(await availability(...window), resource.id)).toBe("AVAILABLE");

    const created = await createReservation(
      makeRequest("/api/reservations", {
        method: "POST",
        body: { resourceId: resource.id, bookedBy: "Eve", startTime: window[0].toISOString(), endTime: window[1].toISOString() },
      }),
    );
    const { data } = await readBody<ApiSuccess<{ id: string }>>(created);
    expect(stateOf(await availability(...window), resource.id)).toBe("OCCUPIED");

    await cancelReservation(makeRequest("/x", { method: "POST" }), params({ id: data.id }));
    expect(stateOf(await availability(...window), resource.id)).toBe("AVAILABLE");
  });

  it("filters by category", async () => {
    const rooms = await createCategory({ name: "Rooms" });
    const cars = await createCategory({ name: "Cars" });
    await createResource({ categoryId: rooms.id });
    const car = await createResource({ categoryId: cars.id });

    const data = await availability(futureHour(1, 9), futureHour(1, 10), `&categoryId=${cars.id}`);
    expect(data.items.map((item) => item.resource.id)).toEqual([car.id]);
  });

  it("validates the window", async () => {
    const cases = [
      "",
      `?startTime=${futureHour(1, 10).toISOString()}&endTime=${futureHour(1, 9).toISOString()}`,
      `?startTime=${futureHour(1, 9).toISOString()}&endTime=${futureHour(40, 9).toISOString()}`,
      "?startTime=2030-01-01T09:00:00&endTime=2030-01-01T10:00:00",
      `?startTime=${futureHour(1, 9).toISOString()}&endTime=${futureHour(1, 10).toISOString()}&categoryId=nope`,
    ];
    for (const query of cases) {
      const response = await getAvailability(makeRequest(`/api/reservations/availability${query}`));
      expect(response.status, query).toBe(400);
    }
  });
});
