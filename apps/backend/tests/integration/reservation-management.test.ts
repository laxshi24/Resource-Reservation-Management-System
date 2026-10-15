import type { ApiErrorBody, ApiSuccess, Paginated, ReservationDto } from "@rrms/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as listReservations, POST as createReservation } from "@/app/api/reservations/route";
import { PATCH as updateReservation } from "@/app/api/reservations/[id]/route";
import { POST as cancelReservation } from "@/app/api/reservations/[id]/cancel/route";
import { prisma } from "@/lib/prisma";
import { createCategory, createReservation as seed, createResource, futureHour, resetDatabase } from "../fixtures/db";
import { makeRequest, params, readBody } from "../fixtures/http";

async function list(query: string) {
  const response = await listReservations(makeRequest(`/api/reservations${query}`));
  expect(response.status).toBe(200);
  return (await readBody<ApiSuccess<Paginated<ReservationDto>>>(response)).data;
}

function cancel(id: string, body?: unknown) {
  return cancelReservation(makeRequest("/x", { method: "POST", body }), params({ id }));
}

describe("GET /api/reservations", () => {
  beforeEach(resetDatabase);

  it("filters by resource, category, status, timeframe, window and search", async () => {
    const rooms = await createCategory({ name: "Rooms" });
    const cars = await createCategory({ name: "Cars" });
    const room = await createResource({ name: "Room A", categoryId: rooms.id });
    const car = await createResource({ name: "Car 1", categoryId: cars.id });

    const past = await seed({ resourceId: room.id, startTime: futureHour(-2, 9), endTime: futureHour(-2, 10), bookedBy: "Alice" });
    const soon = await seed({ resourceId: room.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10), bookedBy: "Bob" });
    const cancelled = await seed({ resourceId: room.id, startTime: futureHour(1, 11), endTime: futureHour(1, 12), status: "CANCELLED", bookedBy: "Carol" });
    const later = await seed({ resourceId: car.id, startTime: futureHour(5, 9), endTime: futureHour(5, 17), bookedBy: "Dave" });

    const ids = (data: Paginated<ReservationDto>) => data.items.map((item) => item.id);

    expect(ids(await list(""))).toEqual([past.id, soon.id, cancelled.id, later.id]); // startTime asc
    expect(ids(await list(`?resourceId=${car.id}`))).toEqual([later.id]);
    expect(ids(await list(`?categoryId=${rooms.id}`))).toEqual([past.id, soon.id, cancelled.id]);
    expect(ids(await list("?status=CANCELLED"))).toEqual([cancelled.id]);
    expect(ids(await list("?status=CONFIRMED&timeframe=upcoming"))).toEqual([soon.id, later.id]);
    expect(ids(await list("?timeframe=past"))).toEqual([past.id]);
    expect(ids(await list("?search=dav"))).toEqual([later.id]);
    expect(ids(await list("?search=room%20a&sortOrder=desc"))).toEqual([cancelled.id, soon.id, past.id]);

    // Window [day+1 00:00, day+2 00:00) overlaps the two day+1 bookings only.
    const from = futureHour(1, 0).toISOString();
    const to = futureHour(2, 0).toISOString();
    expect(ids(await list(`?from=${from}&to=${to}`))).toEqual([soon.id, cancelled.id]);
  });

  it("paginates and validates query parameters", async () => {
    const resource = await createResource();
    for (let day = 1; day <= 3; day++) {
      await seed({ resourceId: resource.id, startTime: futureHour(day, 9), endTime: futureHour(day, 10) });
    }
    const page = await list("?pageSize=2&page=2");
    expect(page.items).toHaveLength(1);
    expect(page.pagination).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });

    for (const bad of ["?status=DONE", "?pageSize=0", "?from=yesterday", `?from=${futureHour(2, 0).toISOString()}&to=${futureHour(1, 0).toISOString()}`]) {
      const response = await listReservations(makeRequest(`/api/reservations${bad}`));
      expect(response.status, bad).toBe(400);
    }
  });
});

describe("POST /api/reservations/:id/cancel", () => {
  beforeEach(resetDatabase);

  it("cancels a confirmed reservation with an optional reason and persists it", async () => {
    const resource = await createResource();
    const reservation = await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });

    const response = await cancel(reservation.id, { reason: "Meeting moved online" });
    expect(response.status).toBe(200);
    const body = await readBody<ApiSuccess<ReservationDto>>(response);
    expect(body.data).toMatchObject({ status: "CANCELLED", cancellationReason: "Meeting moved online" });
    expect(body.data.cancelledAt).not.toBeNull();

    const row = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(row?.status).toBe("CANCELLED");
  });

  it("accepts an empty body", async () => {
    const resource = await createResource();
    const reservation = await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    const response = await cancel(reservation.id);
    expect(response.status).toBe(200);
  });

  it("frees the slot so it can be booked again", async () => {
    const resource = await createResource();
    const reservation = await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    await cancel(reservation.id);

    const response = await createReservation(
      makeRequest("/api/reservations", {
        method: "POST",
        body: {
          resourceId: resource.id,
          bookedBy: "Next Person",
          startTime: futureHour(1, 9).toISOString(),
          endTime: futureHour(1, 10).toISOString(),
        },
      }),
    );
    expect(response.status).toBe(201);
  });

  it("rejects invalid transitions with 409 and unknown ids with 404", async () => {
    const resource = await createResource();
    const cancelled = await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10), status: "CANCELLED" });
    const ended = await seed({ resourceId: resource.id, startTime: futureHour(-1, 9), endTime: futureHour(-1, 10) });

    const twice = await cancel(cancelled.id);
    expect(twice.status).toBe(409);
    expect((await readBody<ApiErrorBody>(twice)).error.code).toBe("RESERVATION_ALREADY_CANCELLED");

    const past = await cancel(ended.id);
    expect(past.status).toBe(409);
    expect((await readBody<ApiErrorBody>(past)).error.code).toBe("RESERVATION_ALREADY_ENDED");

    expect((await cancel("0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11")).status).toBe(404);
    expect((await cancel(cancelled.id, { reason: "x".repeat(301) })).status).toBe(400);
  });

  it("lets only one of two simultaneous cancellations succeed", async () => {
    const resource = await createResource();
    const reservation = await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    const statuses = (await Promise.all([cancel(reservation.id), cancel(reservation.id)])).map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
  });
});

describe("PATCH /api/reservations/:id", () => {
  beforeEach(resetDatabase);

  it("updates booker name and purpose of a confirmed reservation", async () => {
    const resource = await createResource();
    const reservation = await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    const response = await updateReservation(
      makeRequest("/x", { method: "PATCH", body: { bookedBy: "New Name", purpose: "" } }),
      params({ id: reservation.id }),
    );
    expect(response.status).toBe(200);
    expect((await readBody<ApiSuccess<ReservationDto>>(response)).data).toMatchObject({ bookedBy: "New Name", purpose: null });
  });

  it("does not allow status or time changes through PATCH", async () => {
    const resource = await createResource();
    const cancelled = await seed({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10), status: "CANCELLED" });

    for (const body of [{ status: "CONFIRMED" }, { startTime: futureHour(2, 9).toISOString() }, {}]) {
      const response = await updateReservation(makeRequest("/x", { method: "PATCH", body }), params({ id: cancelled.id }));
      expect(response.status).toBe(400);
    }
    // A cancelled reservation cannot be edited at all.
    const edit = await updateReservation(
      makeRequest("/x", { method: "PATCH", body: { purpose: "Revive" } }),
      params({ id: cancelled.id }),
    );
    expect(edit.status).toBe(409);
    expect((await prisma.reservation.findUnique({ where: { id: cancelled.id } }))?.status).toBe("CANCELLED");
  });
});
