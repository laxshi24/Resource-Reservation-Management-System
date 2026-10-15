import type { ResourceDto } from "@rrms/shared";
import type { Prisma } from "@/generated/prisma/client";

/** Prisma `include` used whenever a resource is returned to the client. */
export const resourceInclude = {
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ResourceInclude;

export type ResourceWithCategory = Prisma.ResourceGetPayload<{ include: typeof resourceInclude }>;

/** Maps a database row to the public API shape (Dates become ISO strings). */
export function toResourceDto(resource: ResourceWithCategory): ResourceDto {
  return {
    id: resource.id,
    name: resource.name,
    description: resource.description,
    location: resource.location,
    capacity: resource.capacity,
    isActive: resource.isActive,
    category: resource.category,
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  };
}
