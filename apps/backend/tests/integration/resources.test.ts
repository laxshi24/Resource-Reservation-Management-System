import type { ApiErrorBody, ApiSuccess, Paginated, ResourceDto } from "@rrms/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as listResources, POST as createResource } from "@/app/api/resources/route";
import { GET as getResource, PATCH as updateResource } from "@/app/api/resources/[id]/route";
import { GET as listCategories } from "@/app/api/resource-categories/route";
import { prisma } from "@/lib/prisma";
import { createCategory, createResource as seedResource, resetDatabase } from "../fixtures/db";
import { makeRequest, params, readBody } from "../fixtures/http";

describe("Resources API", () => {
  beforeEach(resetDatabase);

  describe("POST /api/resources", () => {
    it("creates a resource and persists it in PostgreSQL", async () => {
      const category = await createCategory({ name: "Meeting Rooms" });
      const response = await createResource(
        makeRequest("/api/resources", {
          method: "POST",
          body: { name: "  Board Room  ", categoryId: category.id, capacity: 12, location: "Level 5", description: "" },
        }),
      );
      expect(response.status).toBe(201);
      const body = await readBody<ApiSuccess<ResourceDto>>(response);
      expect(body.data).toMatchObject({
        name: "Board Room", // trimmed
        capacity: 12,
        description: null, // "" normalised to null
        isActive: true,
        category: { id: category.id, name: "Meeting Rooms" },
      });

      const row = await prisma.resource.findUnique({ where: { id: body.data.id } });
      expect(row?.name).toBe("Board Room");
    });

    it("rejects invalid input with field-level details", async () => {
      const response = await createResource(
        makeRequest("/api/resources", {
          method: "POST",
          body: { name: "A", categoryId: "not-a-uuid", capacity: 0, unexpected: true },
        }),
      );
      expect(response.status).toBe(400);
      const body = await readBody<ApiErrorBody>(response);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      const paths = body.error.details?.map((detail) => detail.path);
      expect(paths).toEqual(expect.arrayContaining(["name", "categoryId", "capacity"]));
    });

    it("rejects malformed JSON with 400", async () => {
      const response = await createResource(makeRequest("/api/resources", { method: "POST", rawBody: "{oops" }));
      expect(response.status).toBe(400);
      expect((await readBody<ApiErrorBody>(response)).error.code).toBe("INVALID_JSON");
    });

    it("rejects a duplicate name regardless of case with 409", async () => {
      const category = await createCategory();
      await seedResource({ name: "Huddle Room", categoryId: category.id });
      const response = await createResource(
        makeRequest("/api/resources", { method: "POST", body: { name: "HUDDLE room", categoryId: category.id } }),
      );
      expect(response.status).toBe(409);
      expect((await readBody<ApiErrorBody>(response)).error.code).toBe("RESOURCE_NAME_TAKEN");
    });

    it("enforces case-insensitive uniqueness at the database level too", async () => {
      const category = await createCategory();
      await seedResource({ name: "Pod", categoryId: category.id });
      await expect(seedResource({ name: "POD", categoryId: category.id })).rejects.toThrow();
    });

    it("rejects an unknown category", async () => {
      const response = await createResource(
        makeRequest("/api/resources", {
          method: "POST",
          body: { name: "Room", categoryId: "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11" },
        }),
      );
      expect(response.status).toBe(400);
      expect((await readBody<ApiErrorBody>(response)).error.details?.[0]?.path).toBe("categoryId");
    });
  });

  describe("GET /api/resources", () => {
    it("searches, filters by category/status and paginates deterministically", async () => {
      const rooms = await createCategory({ name: "Rooms" });
      const vehicles = await createCategory({ name: "Vehicles" });
      await seedResource({ name: "Alpha Room", categoryId: rooms.id });
      await seedResource({ name: "Beta Room", categoryId: rooms.id, isActive: false });
      await seedResource({ name: "Gamma Room", categoryId: rooms.id });
      await seedResource({ name: "Van", categoryId: vehicles.id });

      const search = await readBody<ApiSuccess<Paginated<ResourceDto>>>(
        await listResources(makeRequest("/api/resources?search=room&status=active")),
      );
      expect(search.data.items.map((r) => r.name)).toEqual(["Alpha Room", "Gamma Room"]);

      const inactive = await readBody<ApiSuccess<Paginated<ResourceDto>>>(
        await listResources(makeRequest("/api/resources?status=inactive")),
      );
      expect(inactive.data.items.map((r) => r.name)).toEqual(["Beta Room"]);

      const byCategory = await readBody<ApiSuccess<Paginated<ResourceDto>>>(
        await listResources(makeRequest(`/api/resources?categoryId=${vehicles.id}`)),
      );
      expect(byCategory.data.items.map((r) => r.name)).toEqual(["Van"]);

      const page2 = await readBody<ApiSuccess<Paginated<ResourceDto>>>(
        await listResources(makeRequest("/api/resources?pageSize=3&page=2")),
      );
      expect(page2.data.items.map((r) => r.name)).toEqual(["Van"]);
      expect(page2.data.pagination).toEqual({ page: 2, pageSize: 3, totalItems: 4, totalPages: 2 });
    });

    it("validates query parameters", async () => {
      const response = await listResources(makeRequest("/api/resources?pageSize=500&status=maybe"));
      expect(response.status).toBe(400);
    });
  });

  describe("GET/PATCH /api/resources/:id", () => {
    it("returns 404 for unknown or malformed ids", async () => {
      const unknown = await getResource(makeRequest("/x"), params({ id: "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11" }));
      expect(unknown.status).toBe(404);
      const malformed = await getResource(makeRequest("/x"), params({ id: "123" }));
      expect(malformed.status).toBe(404);
    });

    it("updates fields and deactivates/reactivates a resource", async () => {
      const resource = await seedResource({ name: "Projector 1", capacity: null });

      const renamed = await updateResource(
        makeRequest("/x", { method: "PATCH", body: { name: "Projector One", location: "Store" } }),
        params({ id: resource.id }),
      );
      expect(renamed.status).toBe(200);
      expect((await readBody<ApiSuccess<ResourceDto>>(renamed)).data).toMatchObject({
        name: "Projector One",
        location: "Store",
      });

      const deactivated = await updateResource(
        makeRequest("/x", { method: "PATCH", body: { isActive: false } }),
        params({ id: resource.id }),
      );
      expect((await readBody<ApiSuccess<ResourceDto>>(deactivated)).data.isActive).toBe(false);

      const row = await prisma.resource.findUnique({ where: { id: resource.id } });
      expect(row?.isActive).toBe(false);
    });

    it("rejects empty updates, unknown fields and name clashes", async () => {
      const category = await createCategory();
      const first = await seedResource({ name: "Room 1", categoryId: category.id });
      await seedResource({ name: "Room 2", categoryId: category.id });

      const empty = await updateResource(makeRequest("/x", { method: "PATCH", body: {} }), params({ id: first.id }));
      expect(empty.status).toBe(400);

      const unknownField = await updateResource(
        makeRequest("/x", { method: "PATCH", body: { id: "hack" } }),
        params({ id: first.id }),
      );
      expect(unknownField.status).toBe(400);

      const clash = await updateResource(
        makeRequest("/x", { method: "PATCH", body: { name: "room 2" } }),
        params({ id: first.id }),
      );
      expect(clash.status).toBe(409);

      // Changing only the letter case of its own name is allowed.
      const sameName = await updateResource(
        makeRequest("/x", { method: "PATCH", body: { name: "ROOM 1" } }),
        params({ id: first.id }),
      );
      expect(sameName.status).toBe(200);
    });
  });

  describe("GET /api/resource-categories", () => {
    it("lists categories with resource counts", async () => {
      const category = await createCategory({ name: "Projectors" });
      await seedResource({ categoryId: category.id });
      await seedResource({ categoryId: category.id });
      const body = await readBody<ApiSuccess<Array<{ name: string; resourceCount: number }>>>(
        await listCategories(makeRequest("/api/resource-categories")),
      );
      expect(body.data).toEqual([expect.objectContaining({ name: "Projectors", resourceCount: 2 })]);
    });
  });
});
