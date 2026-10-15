import { ERROR_CODES, type Paginated, type ResourceDetailDto, type ResourceDto } from "@rrms/shared";
import { ApiError } from "@/lib/api-error";
import type { AuthContext } from "@/lib/auth";
import { paginationMeta } from "@/lib/pagination";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { reservationInclude, toReservationDto } from "@/modules/reservations/reservation.types";
import { resourceRepository } from "./resource.repository";
import type { CreateResourceInput, ListResourcesQuery, UpdateResourceInput } from "./resource.schema";
import { toResourceDto } from "./resource.types";

export const resourceNotFound = () =>
  ApiError.notFound(ERROR_CODES.RESOURCE_NOT_FOUND, "The requested resource does not exist.");

const nameTaken = (name: string) =>
  ApiError.conflict(ERROR_CODES.RESOURCE_NAME_TAKEN, `A resource named "${name}" already exists.`);

const hasReservations = (name: string, count?: number) =>
  ApiError.conflict(
    ERROR_CODES.RESOURCE_HAS_RESERVATIONS,
    `"${name}" has ${count ? `${count} reservation${count === 1 ? "" : "s"}` : "reservations"} and cannot be deleted. Deactivate it instead to keep its booking history.`,
  );

async function assertCategoryExists(categoryId: string) {
  const category = await prisma.resourceCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) {
    throw ApiError.validation("The selected category does not exist.", [
      { path: "categoryId", message: "Category not found" },
    ]);
  }
}

async function assertNameAvailable(name: string, excludeId?: string) {
  if (await resourceRepository.findByNameInsensitive(name, excludeId)) throw nameTaken(name);
}

export const resourceService = {
  async list(query: ListResourcesQuery): Promise<Paginated<ResourceDto>> {
    const { items, total } = await resourceRepository.findMany(query);
    return { items: items.map(toResourceDto), pagination: paginationMeta(query.page, query.pageSize, total) };
  },

  /**
   * Admins see every reservation of the resource. Regular users cannot see
   * inactive resources and only see their own bookings in the statistics.
   */
  async getById(id: string, auth: Pick<AuthContext, "isAdmin" | "user">): Promise<ResourceDetailDto> {
    const resource = await resourceRepository.findById(id);
    if (!resource || (!auth.isAdmin && !resource.isActive)) throw resourceNotFound();

    const now = new Date();
    const scope = auth.isAdmin ? {} : { userId: auth.user.id };
    const upcomingWhere = { resourceId: id, ...scope, status: "CONFIRMED" as const, endTime: { gt: now } };
    const [totalReservations, upcomingConfirmed, upcoming] = await prisma.$transaction([
      prisma.reservation.count({ where: { resourceId: id, ...scope } }),
      prisma.reservation.count({ where: upcomingWhere }),
      prisma.reservation.findMany({
        where: upcomingWhere,
        include: reservationInclude,
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        take: 5,
      }),
    ]);

    return {
      ...toResourceDto(resource),
      stats: { totalReservations, upcomingConfirmed },
      upcomingReservations: upcoming.map(toReservationDto),
    };
  },

  async create(input: CreateResourceInput): Promise<ResourceDto> {
    await assertCategoryExists(input.categoryId);
    await assertNameAvailable(input.name);
    try {
      return toResourceDto(await resourceRepository.create(input));
    } catch (error) {
      // The case-insensitive unique index is the final guard against races.
      if (isUniqueViolation(error)) throw nameTaken(input.name);
      throw error;
    }
  },

  async update(id: string, input: UpdateResourceInput): Promise<ResourceDto> {
    const existing = await resourceRepository.findById(id);
    if (!existing) throw resourceNotFound();
    if (input.categoryId && input.categoryId !== existing.categoryId) await assertCategoryExists(input.categoryId);
    if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      await assertNameAvailable(input.name, id);
    }
    try {
      return toResourceDto(await resourceRepository.update(id, input));
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken(input.name ?? existing.name);
      throw error;
    }
  },

  /**
   * Deletion policy: a resource can only be deleted while it has no
   * reservations at all (past, future or cancelled). Otherwise history would
   * be lost, so the client is told to deactivate it instead. The database
   * foreign key (ON DELETE RESTRICT) enforces the same rule.
   */
  async delete(id: string): Promise<void> {
    const existing = await resourceRepository.findById(id);
    if (!existing) throw resourceNotFound();

    const reservationCount = await prisma.reservation.count({ where: { resourceId: id } });
    if (reservationCount > 0) throw hasReservations(existing.name, reservationCount);

    try {
      await prisma.resource.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) throw hasReservations(existing.name);
      throw error;
    }
  },
};
