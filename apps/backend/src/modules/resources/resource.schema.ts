import { FIELD_LIMITS } from "@rrms/shared";
import { z } from "zod";
import { paginationQuerySchema } from "@/lib/pagination";
import { optionalText, uuidSchema } from "@/lib/validation";

const { resourceName, resourceDescription, resourceLocation, resourceCapacity, search } = FIELD_LIMITS;

const nameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .min(resourceName.min, `Name must be at least ${resourceName.min} characters`)
  .max(resourceName.max, `Name must be at most ${resourceName.max} characters`);

const capacitySchema = z
  .number({ error: "Capacity must be a number" })
  .int("Capacity must be a whole number")
  .min(resourceCapacity.min, `Capacity must be at least ${resourceCapacity.min}`)
  .max(resourceCapacity.max, `Capacity must be at most ${resourceCapacity.max}`)
  .nullish()
  .transform((value) => value ?? null);

export const createResourceSchema = z.strictObject({
  name: nameSchema,
  categoryId: uuidSchema,
  description: optionalText(resourceDescription.max, "Description"),
  location: optionalText(resourceLocation.max, "Location"),
  capacity: capacitySchema,
  isActive: z.boolean({ error: "isActive must be true or false" }).default(true),
});

/** PATCH: every field optional, but at least one must be present. Unknown fields are rejected. */
export const updateResourceSchema = z
  .strictObject({
    name: nameSchema.optional(),
    categoryId: uuidSchema.optional(),
    description: optionalText(resourceDescription.max, "Description").optional(),
    location: optionalText(resourceLocation.max, "Location").optional(),
    capacity: capacitySchema.optional(),
    isActive: z.boolean({ error: "isActive must be true or false" }).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update" });

export const listResourcesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(search.max, `search must be at most ${search.max} characters`).optional(),
  categoryId: uuidSchema.optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "capacity"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateResourceInput = z.output<typeof createResourceSchema>;
export type UpdateResourceInput = z.output<typeof updateResourceSchema>;
export type ListResourcesQuery = z.output<typeof listResourcesQuerySchema>;
