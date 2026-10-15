import type { ApiErrorBody } from "@rrms/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createReservation } from "@/app/api/reservations/route";
import { prisma } from "@/lib/prisma";
import { mentionsConstraint } from "@/lib/prisma-errors";
import { NO_OVERLAP_CONSTRAINT } from "@/modules/reservations/reservation-overlap";
import { reservationRepository } from "@/modules/reservations/reservation.repository";
import { createReservation as insertReservation, createResource, futureHour, resetDatabase } from "../fixtures/db";
import { makeRequest, readBody } from "../fixtures/http";

/**
 * These tests prove that double booking is prevented by PostgreSQL itself
 * (the `reservations_no_overlap` exclusion constraint), not merely by the
 * application's "check, then insert" logic.
 */
describe("Double-booking protection (database level)", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.restoreAllMocks());

  it("rejects an overlapping CONFIRMED row even when application checks are bypassed", async () => {
    const resource = await createResource();
    await insertReservation({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 11) });

    const error = await insertReservation({
      resourceId: resource.id,
      startTime: futureHour(1, 10),
      endTime: futureHour(1, 12),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(mentionsConstraint(error, NO_OVERLAP_CONSTRAINT)).toBe(true);
  });

  it("allows back-to-back rows and rows overlapping only cancelled reservations", async () => {
    const resource = await createResource();
    await insertReservation({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    await insertReservation({ resourceId: resource.id, startTime: futureHour(1, 10), endTime: futureHour(1, 11) });
    await insertReservation({ resourceId: resource.id, startTime: futureHour(1, 12), endTime: futureHour(1, 13), status: "CANCELLED" });
    await expect(
      insertReservation({ resourceId: resource.id, startTime: futureHour(1, 12), endTime: futureHour(1, 13) }),
    ).resolves.toBeDefined();
    expect(await prisma.reservation.count()).toBe(4);
  });

  it("prevents re-confirming a cancelled reservation whose slot has since been taken", async () => {
    const resource = await createResource();
    const cancelled = await insertReservation({
      resourceId: resource.id,
      startTime: futureHour(1, 9),
      endTime: futureHour(1, 10),
      status: "CANCELLED",
    });
    await insertReservation({ resourceId: resource.id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });

    await expect(
      prisma.reservation.update({ where: { id: cancelled.id }, data: { status: "CONFIRMED", cancelledAt: null } }),
    ).rejects.toThrow();
  });

  it("lets exactly one of many simultaneous raw inserts succeed", async () => {
    const resource = await createResource();
    const attempts = Array.from({ length: 10 }, (_, index) =>
      insertReservation({
        resourceId: resource.id,
        // All overlap 09:30-10:00, with slightly different boundaries.
        startTime: futureHour(1, 9, index % 3 === 0 ? 0 : 15),
        endTime: futureHour(1, 10, index % 2 === 0 ? 0 : 30),
        bookedBy: `Racer ${index}`,
      }),
    );

    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((result) => result.status === "fulfilled");
    const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(9);
    for (const failure of failed) expect(mentionsConstraint(failure.reason, NO_OVERLAP_CONSTRAINT)).toBe(true);
    expect(await prisma.reservation.count({ where: { resourceId: resource.id, status: "CONFIRMED" } })).toBe(1);
  });
});

describe("Double-booking protection (API level)", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.restoreAllMocks());

  const payload = (resourceId: string, bookedBy: string) => ({
    resourceId,
    bookedBy,
    startTime: futureHour(3, 14).toISOString(),
    endTime: futureHour(3, 15).toISOString(),
  });

  it("returns exactly one 201 and 409 for every other simultaneous request", async () => {
    const resource = await createResource();
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        createReservation(makeRequest("/api/reservations", { method: "POST", body: payload(resource.id, `User ${index}`) })),
      ),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(9);
    for (const response of responses.filter((r) => r.status === 409)) {
      expect((await readBody<ApiErrorBody>(response)).error.code).toBe("RESERVATION_CONFLICT");
    }
    expect(await prisma.reservation.count()).toBe(1);
  });

  it("maps a constraint violation to 409 even if the pre-check misses the conflict (race window)", async () => {
    const resource = await createResource();
    await insertReservation({ resourceId: resource.id, startTime: futureHour(3, 14), endTime: futureHour(3, 15) });

    // Simulate the race: the pre-check sees no overlap, but the row exists.
    vi.spyOn(reservationRepository, "findBlockingOverlaps").mockResolvedValue([]);

    const response = await createReservation(
      makeRequest("/api/reservations", { method: "POST", body: payload(resource.id, "Late User") }),
    );
    expect(response.status).toBe(409);
    expect((await readBody<ApiErrorBody>(response)).error.code).toBe("RESERVATION_CONFLICT");
  });
});
