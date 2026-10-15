import type { ApiSuccess, AvailabilityDto, MyDashboardDto, Paginated, ReservationDto, ResourceDto } from "@rrms/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as adminDashboard } from "@/app/api/dashboard/route";
import { GET as myDashboard } from "@/app/api/me/dashboard/route";
import { GET as availability } from "@/app/api/reservations/availability/route";
import { POST as cancelReservation } from "@/app/api/reservations/[id]/cancel/route";
import { GET as getReservation, PATCH as updateReservation } from "@/app/api/reservations/[id]/route";
import { GET as listReservations, POST as createReservation } from "@/app/api/reservations/route";
import { DELETE as deleteResource, GET as getResource, PATCH as updateResource } from "@/app/api/resources/[id]/route";
import { GET as listResources, POST as createResource } from "@/app/api/resources/route";
import { GET as listUsers } from "@/app/api/users/route";
import { account } from "../fixtures/auth";
import { createCategory, createReservation as seed, createResource as seedResource, futureHour, resetDatabase } from "../fixtures/db";
import { makeRequest, params, readBody } from "../fixtures/http";

describe("Authorization", () => {
  beforeEach(resetDatabase);

  it("requires a session for every data endpoint", async () => {
    const resource = await seedResource();
    const none = { as: "none" as const };
    const responses = await Promise.all([
      listResources(makeRequest("/api/resources", none)),
      getResource(makeRequest("/x", none), params({ id: resource.id })),
      listReservations(makeRequest("/api/reservations", none)),
      createReservation(makeRequest("/api/reservations", { ...none, method: "POST", body: {} })),
      availability(makeRequest(`/api/reservations/availability?startTime=${futureHour(1, 9).toISOString()}&endTime=${futureHour(1, 10).toISOString()}`, none)),
      myDashboard(makeRequest("/api/me/dashboard", none)),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });

  it("keeps resource management and admin views admin-only", async () => {
    const category = await createCategory();
    const resource = await seedResource({ categoryId: category.id });
    const user = { as: "user" as const };
    const responses = await Promise.all([
      createResource(makeRequest("/api/resources", { ...user, method: "POST", body: { name: "Hack Room", categoryId: category.id } })),
      updateResource(makeRequest("/x", { ...user, method: "PATCH", body: { isActive: false } }), params({ id: resource.id })),
      deleteResource(makeRequest("/x", { ...user, method: "DELETE" }), params({ id: resource.id })),
      adminDashboard(makeRequest("/api/dashboard", user)),
      listUsers(makeRequest("/api/users", user)),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403]);

    // An ADMIN account logged in on the *user* website is treated as a regular user there.
    const users = await listUsers(makeRequest("/api/users"));
    expect(users.status).toBe(200);
  });

  it("shows regular users only active resources", async () => {
    await seedResource({ name: "Open Room" });
    const closed = await seedResource({ name: "Closed Room", isActive: false });

    const forUser = await readBody<ApiSuccess<Paginated<ResourceDto>>>(
      await listResources(makeRequest("/api/resources?status=all", { as: "user" })),
    );
    expect(forUser.data.items.map((r) => r.name)).toEqual(["Open Room"]);
    expect((await getResource(makeRequest("/x", { as: "user" }), params({ id: closed.id }))).status).toBe(404);

    const forAdmin = await readBody<ApiSuccess<Paginated<ResourceDto>>>(await listResources(makeRequest("/api/resources")));
    expect(forAdmin.data.items).toHaveLength(2);
  });

  it("books under the user's own account and name", async () => {
    const resource = await seedResource();
    const response = await createReservation(
      makeRequest("/api/reservations", {
        as: "user",
        method: "POST",
        body: {
          resourceId: resource.id,
          bookedBy: "Somebody Else", // ignored for regular users
          startTime: futureHour(1, 9).toISOString(),
          endTime: futureHour(1, 10).toISOString(),
        },
      }),
    );
    expect(response.status).toBe(201);
    expect((await readBody<ApiSuccess<ReservationDto>>(response)).data).toMatchObject({
      userId: account("user").id,
      bookedBy: "Test User",
    });
  });

  it("lets admins book on behalf of someone", async () => {
    const resource = await seedResource();
    const response = await createReservation(
      makeRequest("/api/reservations", {
        method: "POST",
        body: { resourceId: resource.id, bookedBy: "Visitor Name", startTime: futureHour(1, 9).toISOString(), endTime: futureHour(1, 10).toISOString() },
      }),
    );
    expect((await readBody<ApiSuccess<ReservationDto>>(response)).data).toMatchObject({
      bookedBy: "Visitor Name",
      userId: account("admin").id,
    });
  });

  it("isolates users' reservations from each other", async () => {
    const resource = await seedResource();
    const mine = await seed({ resourceId: resource.id, userId: account("user").id, startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    const theirs = await seed({ resourceId: resource.id, userId: account("otherUser").id, startTime: futureHour(1, 11), endTime: futureHour(1, 12) });

    const list = await readBody<ApiSuccess<Paginated<ReservationDto>>>(await listReservations(makeRequest("/api/reservations", { as: "user" })));
    expect(list.data.items.map((r) => r.id)).toEqual([mine.id]);

    // Someone else's booking is invisible: 404 for read, cancel and edit.
    expect((await getReservation(makeRequest("/x", { as: "user" }), params({ id: theirs.id }))).status).toBe(404);
    expect((await cancelReservation(makeRequest("/x", { as: "user", method: "POST" }), params({ id: theirs.id }))).status).toBe(404);
    expect(
      (await updateReservation(makeRequest("/x", { as: "user", method: "PATCH", body: { purpose: "Mine now" } }), params({ id: theirs.id }))).status,
    ).toBe(404);

    // Users can cancel and edit (purpose only) their own booking.
    expect(
      (await updateReservation(makeRequest("/x", { as: "user", method: "PATCH", body: { bookedBy: "Renamed" } }), params({ id: mine.id }))).status,
    ).toBe(400);
    expect((await cancelReservation(makeRequest("/x", { as: "user", method: "POST" }), params({ id: mine.id }))).status).toBe(200);

    // Admins see and manage everything.
    const all = await readBody<ApiSuccess<Paginated<ReservationDto>>>(await listReservations(makeRequest("/api/reservations")));
    expect(all.data.items).toHaveLength(2);
    expect((await cancelReservation(makeRequest("/x", { method: "POST" }), params({ id: theirs.id }))).status).toBe(200);
  });

  it("hides who booked a resource from other users in availability results", async () => {
    const busy = await seedResource({ name: "Busy" });
    await seedResource({ name: "Closed", isActive: false });
    await seed({ resourceId: busy.id, userId: account("otherUser").id, bookedBy: "Other User", startTime: futureHour(1, 9), endTime: futureHour(1, 10) });
    const query = `/api/reservations/availability?startTime=${futureHour(1, 9).toISOString()}&endTime=${futureHour(1, 10).toISOString()}`;

    const forUser = await readBody<ApiSuccess<AvailabilityDto>>(await availability(makeRequest(query, { as: "user" })));
    expect(forUser.data.items.map((i) => i.resource.name)).toEqual(["Busy"]); // inactive hidden
    expect(forUser.data.items[0]?.conflicts[0]).toMatchObject({ bookedBy: "Reserved", isMine: false });

    const forOwner = await readBody<ApiSuccess<AvailabilityDto>>(await availability(makeRequest(query, { as: "otherUser" })));
    expect(forOwner.data.items[0]?.conflicts[0]).toMatchObject({ bookedBy: "Other User", isMine: true });

    const forAdmin = await readBody<ApiSuccess<AvailabilityDto>>(await availability(makeRequest(query)));
    expect(forAdmin.data.items[0]?.conflicts[0]?.bookedBy).toBe("Other User");
    expect(forAdmin.data.summary.inactive).toBe(1);
  });

  it("gives each user a personal dashboard", async () => {
    const resource = await seedResource();
    await seedResource();
    await seed({ resourceId: resource.id, userId: account("user").id, startTime: futureHour(2, 9), endTime: futureHour(2, 10) });
    await seed({ resourceId: resource.id, userId: account("otherUser").id, startTime: futureHour(2, 11), endTime: futureHour(2, 12) });

    const day = futureHour(2, 0).toISOString().slice(0, 10);
    const body = await readBody<ApiSuccess<MyDashboardDto>>(await myDashboard(makeRequest(`/api/me/dashboard?date=${day}`, { as: "user" })));
    expect(body.data.totals).toEqual({ activeResources: 2, availableNow: 2, myReservationsOnDate: 1, myUpcoming: 1 });
    expect(body.data.myUpcoming.every((r) => r.userId === account("user").id)).toBe(true);
  });
});
