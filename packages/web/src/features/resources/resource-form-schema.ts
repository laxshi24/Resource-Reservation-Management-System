import { FIELD_LIMITS, type CreateResourceRequest, type ResourceDto } from "@rrms/shared";
import { z } from "zod";

const { resourceName, resourceDescription, resourceLocation, resourceCapacity } = FIELD_LIMITS;

/**
 * Client-side form validation for instant feedback. The backend validates the
 * same rules again (using the same shared limits) - this is only a convenience.
 * Values stay as strings while editing; `toResourceRequest` converts them.
 */
export const resourceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(resourceName.min, `Name must be at least ${resourceName.min} characters`)
    .max(resourceName.max, `Name must be at most ${resourceName.max} characters`),
  categoryId: z.string().min(1, "Please choose a category"),
  description: z.string().trim().max(resourceDescription.max, `Description must be at most ${resourceDescription.max} characters`),
  location: z.string().trim().max(resourceLocation.max, `Location must be at most ${resourceLocation.max} characters`),
  capacity: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= resourceCapacity.min && Number(value) <= resourceCapacity.max),
      `Capacity must be a whole number between ${resourceCapacity.min} and ${resourceCapacity.max}`,
    ),
  isActive: z.boolean(),
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export const emptyResourceForm: ResourceFormValues = {
  name: "",
  categoryId: "",
  description: "",
  location: "",
  capacity: "",
  isActive: true,
};

export function resourceToFormValues(resource: ResourceDto): ResourceFormValues {
  return {
    name: resource.name,
    categoryId: resource.category.id,
    description: resource.description ?? "",
    location: resource.location ?? "",
    capacity: resource.capacity === null ? "" : String(resource.capacity),
    isActive: resource.isActive,
  };
}

export function toResourceRequest(values: ResourceFormValues): CreateResourceRequest {
  return {
    name: values.name.trim(),
    categoryId: values.categoryId,
    description: values.description.trim() || null,
    location: values.location.trim() || null,
    capacity: values.capacity.trim() === "" ? null : Number(values.capacity),
    isActive: values.isActive,
  };
}
