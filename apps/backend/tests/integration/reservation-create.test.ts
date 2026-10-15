import type { ApiErrorBody, ApiSuccess, ReservationDto, ResourceDetailDto } from "@rrms/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as createReservation } from "@/app/api/reservations/route";
import { GET as getReservation } from "@/app/api/reservations/[id]/route";
import { DELETE as deleteResource, GET as getResource } from "@/app/api/resources/[id]/route";
import { prisma } from "@/lib/prisma";
import { createReservation as seedReservation, createResource, futureHour, resetDatabase } from "../fixtures/db";
import { makeRequest, params, readBody } from "../fixtures/http";

function book(body: Record<string, unknown>) {
  return createReservation(makeRequest("/api/reservations", { method: "POST", body }));
}

describe("POST /api/reservations", () => {
  beforeEach(resetDatabase);

  it("creates a confirmed reservation and persists it", async () => {
    const resource = await createResource({ name: "Board Room" });
    const start = futureHour(2, 9);
    const end = futureHour(2, 10, 30);

    const response = await book({
      resourceId: resource.id,
      bookedBy: "  Ada Lovelace ",
      purpose: "Sprint planning",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    expect(response.status).toBe(201);
    const body = await readBody<ApiSuccess<ReservationDto>>(response);
    expect(body.message).toBe("Reservation confirmed.");
    expect(body.data).toMatchObject({
      resourceId: resource.id,
      bookedBy: "Ada Lovelace",
      purpose: "Sprint planning",
      status: "CONFIRMED",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      cancelledAt: null,
      resource: { id: resource.id, name: "Board Room" },
    });

    const row = await prisma.reservation.findUnique({ where: { id: body.data.id } });
    expect(row?.startTime.toISOString()).toBe(start.toISOString());
  });

  it("accepts any explicit offset and stores the same instant", async () => {
    const resource = await createResource();
    const start = futureHour(3, 4); // 04:00Z == 09:30 in Colombo (+05:30)
    const local = start.toISOString().slice(0, 10);
    const response = await book({
      resourceId: resource.id,
      bookedBy: "Grace Hopper",
      startTime: `${local}T09:30:00+05:30`,
      endTime: `${local}T10:30:00+05:30`,
    });
    expect(response.status).toBe(201);
    expect((await readBody<ApiSuccess<ReservationDto>>(response)).data.startTime).toBe(start.toISOString());
  });

  it.each([
    ["end before start", { startTime: futureHour(2, 10), endTime: futureHour(2, 9) }, "endTime"],
    ["zero-length interval", { startTime: futureHour(2, 10), endTime: futureHour(2, 10) }, "endTime"],
    ["shorter than 15 minutes", { startTime: futureHour(2, 10), endTime: futureHour(2, 10, 10) }, "endTime"],
    ["longer than 7 days", { startTime: futureHour(2, 10), endTime: futureHour(10, 10) }, "endTime"],
    ["start in the past", { startTime: futureHour(-1, 10), endTime: futureHour(-1, 11) }, "startTime"],
  ])("rejects an invalid interval: %s", async (_label, times, expectedPath) => {
    const resource = await createResource();
    const response = await book({
      resourceId: resource.id,
      bookedBy: "Test User",
      startTime: times.startTime.toISOString(),
      endTime: times.endTime.toISOString(),
    });
    expect(response.status).toBe(400);
    const body = await readBody<ApiErrorBody>(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.map((detail) => detail.path)).toContain(expectedPath);
  });

  it("rejects timestamps without a timezone offset", async () => {
    const resource = await createResource();
    const response = await book({
      resourceId: resource.id,
      bookedBy: "Test User",
      startTime: "2030-01-01T09:00:00",
      endTime: "2030-01-01T10:00:00",
    });
    expect(response.status).toBe(400);
  });

  it("rejects missing/invalid fields", async () => {
    const response = await book({ resourceId: "abc", bookedBy: "x" });
    expect(response.status).toBe(400);
    const paths = (await readBody<ApiErrorBody>(response)).error.details?.map((detail) => detail.path);
    expect(paths).toEqual(expect.arrayContaining(["resourceId", "bookedBy", "startTime", "endTime"]));
  });

  it("returns 404 for an unknown resource and 409 for an inactive one", async () => {
    const times = { startTime: futureHour(2, 9).toISOString(), endTime: futureHour(2, 10).toISOString() };
    const unknown = await book({ resourceId: "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11", bookedBy: "Test User", ...times });
    expect(unknown.status).toBe(404);

    const inactive = await createResource({ isActive: false });
    const response = await book({ resourceId: inactive.id, bookedBy: "Test User", ...times });
    expect(response.status).toBe(409);
    expect((await readBody<ApiErrorBody>(response)).error.code).toBe("RESOURCE_INACTIVE");
  });

  it("returns 409 when the interval overlaps a confirmed reservation", async () => {
    const resource = await createResource();
    await seedReservation({ resourceId: resource.id, startTime: futureHour(2, 9), endTime: futureHour(2, 11) });

    for (const [start, end] of [
      [futureHour(2, 10), futureHour(2, 12)], // overlaps the end
      [futureHour(2, 8), futureHour(2, 10)], // overlaps the start
      [futureHour(2, 9, 30), futureHour(2, 10, 30)], // inside
      [futureHour(2, 8), futureHour(2, 12)], // surrounds
      [futureHour(2, 9), futureHour(2, 11)], // identical
    ] as const) {
      const response = await book({
        resourceId: resource.id,
        bookedBy: "Test User",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      expect(response.status).toBe(409);
      const body = await readBody<ApiErrorBody>(response);
      expect(body.error).toMatchObject({
        code: "RESERVATION_CONFLICT",
        message: expect.stringContaining("already reserved"),
      });
    }
  });

  it("allows back-to-back reservations (end time is exclusive)", async () => {
    const resource = await createResource();
    await seedReservation({ resourceId: resource.id, startTime: futureHour(2, 9), endTime: futureHour(2, 11) });

    const after = await book({
      resourceId: resource.id,
      bookedBy: "Test User",
      startTime: futureHour(2, 11).toISOString(),
      endTime: futureHour(2, 12).toISOString(),
    });
    const before = await book({
      resourceId: resource.id,
      bookedBy: "Test User",
      startTime: futureHour(2, 8).toISOString(),
      endTime: futureHour(2, 9).toISOString(),
    });
    expect(after.status).toBe(201);
    expect(before.status).toBe(201);
  });

  it("ignores cancelled reservations and other resources", async () => {
    const resource = await createResource();
    const other = await createResource();
    await seedReservation({ resourceId: resource.id, startTime: futureHour(2, 9), endTime: futureHour(2, 11), status: "CANCELLED" });
    await seedReservation({ resourceId: other.id, startTime: futureHour(2, 9), endTime: futureHour(2, 11) });

    const response = await book({
      resourceId: resource.id,
      bookedBy: "Test User",
      startTime: futureHour(2, 9).toISOString(),
      endTime: futureHour(2, 11).toISOString(),
    });
    expect(response.status).toBe(201);
  });
});

describe("GET /api/reservations/:id", () => {
  beforeEach(resetDatabase);

  it("returns the reservation or 404", async () => {
    const resource = await createResource();
    const reservation = await seedReservation({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });

    const found = await getReservation(makeRequest("/x"), params({ id: reservation.id }));
    expect(found.status).toBe(200);
    expect((await readBody<ApiSuccess<ReservationDto>>(found)).data.id).toBe(reservation.id);

    const missing = await getReservation(makeRequest("/x"), params({ id: "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11" }));
    expect(missing.status).toBe(404);
    expect((await readBody<ApiErrorBody>(missing)).error.code).toBe("RESERVATION_NOT_FOUND");
  });
});

describe("Resource details and deletion policy", () => {
  beforeEach(resetDatabase);

  it("includes reservation statistics and upcoming bookings", async () => {
    const resource = await createResource();
    await seedReservation({ resourceId: resource.id, startTime: futureHour(-3, 9), endTime: futureHour(-3, 10) });
    await seedReservation({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    await seedReservation({ resourceId: resource.id, startTime: futureHour(2, 9), endTime: futureHour(2, 10), status: "CANCELLED" });

    const body = await readBody<ApiSuccess<ResourceDetailDto>>(
      await getResource(makeRequest("/x"), params({ id: resource.id })),
    );
    expect(body.data.stats).toEqual({ totalReservations: 3, upcomingConfirmed: 1 });
    expect(body.data.upcomingReservations).toHaveLength(1);
  });

  it("deletes a resource without reservations (204)", async () => {
    const resource = await createResource();
    const response = await deleteResource(makeRequest("/x", { method: "DELETE" }), params({ id: resource.id }));
    expect(response.status).toBe(204);
    expect(await prisma.resource.findUnique({ where: { id: resource.id } })).toBeNull();
  });

  it("refuses to delete a resource with reservation history (409) and keeps the data", async () => {
    const resource = await createResource();
    await seedReservation({ resourceId: resource.id, startTime: futureHour(-3, 9), endTime: futureHour(-3, 10), status: "CANCELLED" });

    const response = await deleteResource(makeRequest("/x", { method: "DELETE" }), params({ id: resource.id }));
    expect(response.status).toBe(409);
    expect((await readBody<ApiErrorBody>(response)).error.code).toBe("RESOURCE_HAS_RESERVATIONS");
    expect(await prisma.resource.findUnique({ where: { id: resource.id } })).not.toBeNull();
  });

  it("is also protected by the database foreign key", async () => {
    const resource = await createResource();
    await seedReservation({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    await expect(prisma.resource.delete({ where: { id: resource.id } })).rejects.toThrow();
  });
});
