import type { Prisma } from "@/generated/prisma/client";
import { paginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { ListResourcesQuery } from "./resource.schema";
import { resourceInclude } from "./resource.types";

function buildWhere(query: ListResourcesQuery): Prisma.ResourceWhereInput {
  const where: Prisma.ResourceWhereInput = {};
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.status !== "all") where.isActive = query.status === "active";
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { location: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export const resourceRepository = {
  async findMany(query: ListResourcesQuery) {
    const where = buildWhere(query);
    const primaryOrder: Prisma.ResourceOrderByWithRelationInput =
      query.sortBy === "capacity"
        ? { capacity: { sort: query.sortOrder, nulls: "last" } } // capacity is nullable
        : { [query.sortBy]: query.sortOrder };
    const [items, total] = await prisma.$transaction([
      prisma.resource.findMany({
        where,
        include: resourceInclude,
        // `id` as a tie-breaker keeps the order deterministic across pages.
        orderBy: [primaryOrder, { id: "asc" }],
        ...paginationArgs(query.page, query.pageSize),
      }),
      prisma.resource.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: string) {
    return prisma.resource.findUnique({ where: { id }, include: resourceInclude });
  },

  findByNameInsensitive(name: string, excludeId?: string) {
    return prisma.resource.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
  },

  create(data: Prisma.ResourceUncheckedCreateInput) {
    return prisma.resource.create({ data, include: resourceInclude });
  },

  update(id: string, data: Prisma.ResourceUncheckedUpdateInput) {
    return prisma.resource.update({ where: { id }, data, include: resourceInclude });
  },
};
