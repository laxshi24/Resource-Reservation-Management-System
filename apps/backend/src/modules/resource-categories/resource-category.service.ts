import type { ResourceCategoryDto } from "@rrms/shared";
import { prisma } from "@/lib/prisma";

/**
 * Categories are reference data managed through the seed/migrations, so the
 * API only exposes a read operation (no repository/controller layers needed).
 */
export const resourceCategoryService = {
  async list(): Promise<ResourceCategoryDto[]> {
    const categories = await prisma.resourceCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { resources: true } } },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      resourceCount: category._count.resources,
    }));
  },
};
