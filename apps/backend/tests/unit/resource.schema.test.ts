import { describe, expect, it } from "vitest";
import {
  createResourceSchema,
  listResourcesQuerySchema,
  updateResourceSchema,
} from "@/modules/resources/resource.schema";

const categoryId = "0b6a5b7e-8f53-4f6e-a7a5-2f6f4a7f9c11";

describe("resource schemas", () => {
  it("normalises valid input", () => {
    const result = createResourceSchema.parse({ name: "  Room  ", categoryId, location: "", capacity: null });
    expect(result).toEqual({
      name: "Room",
      categoryId,
      description: null,
      location: null,
      capacity: null,
      isActive: true,
    });
  });

  it("rejects out-of-range and non-integer capacity", () => {
    expect(createResourceSchema.safeParse({ name: "Room", categoryId, capacity: 0 }).success).toBe(false);
    expect(createResourceSchema.safeParse({ name: "Room", categoryId, capacity: 1001 }).success).toBe(false);
    expect(createResourceSchema.safeParse({ name: "Room", categoryId, capacity: 2.5 }).success).toBe(false);
  });

  it("rejects names that are too short or too long", () => {
    expect(createResourceSchema.safeParse({ name: " a ", categoryId }).success).toBe(false);
    expect(createResourceSchema.safeParse({ name: "x".repeat(101), categoryId }).success).toBe(false);
  });

  it("requires at least one field on update and rejects unknown fields", () => {
    expect(updateResourceSchema.safeParse({}).success).toBe(false);
    expect(updateResourceSchema.safeParse({ createdAt: "now" }).success).toBe(false);
    expect(updateResourceSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("applies list defaults and coerces numbers", () => {
    expect(listResourcesQuerySchema.parse({ page: "2" })).toMatchObject({
      page: 2,
      pageSize: 10,
      status: "all",
      sortBy: "name",
      sortOrder: "asc",
    });
  });
});
