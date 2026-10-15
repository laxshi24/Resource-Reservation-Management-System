import { FIELD_LIMITS, type Paginated, type UserListItemDto } from "@rrms/shared";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { paginationArgs, paginationMeta, paginationQuerySchema } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(FIELD_LIMITS.search.max).optional(),
  role: z.enum(["USER", "ADMIN", "all"]).default("all"),
});

export type ListUsersQuery = z.output<typeof listUsersQuerySchema>;

/** Read-only list of accounts for administrators (password hashes are never selected). */
export const userService = {
  async list(query: ListUsersQuery): Promise<Paginated<UserListItemDto>> {
    const where: Prisma.UserWhereInput = {
      ...(query.role !== "all" ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { reservations: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        ...paginationArgs(query.page, query.pageSize),
      }),
      prisma.user.count({ where }),
    ]);
    return {
      items: users.map(({ _count, createdAt, ...user }) => ({
        ...user,
        createdAt: createdAt.toISOString(),
        reservationCount: _count.reservations,
      })),
      pagination: paginationMeta(query.page, query.pageSize, total),
    };
  },
};
