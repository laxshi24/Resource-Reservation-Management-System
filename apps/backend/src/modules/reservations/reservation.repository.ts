import type { Prisma } from "@/generated/prisma/client";
import { paginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { blockingOverlapWhere, type Interval } from "./reservation-overlap";
import type { ListReservationsQuery } from "./reservation.schema";
import { reservationInclude } from "./reservation.types";

function buildListWhere(query: ListReservationsQuery, now: Date, userId?: string): Prisma.ReservationWhereInput {
  const and: Prisma.ReservationWhereInput[] = [];
  if (userId) and.push({ userId });
  if (query.resourceId) and.push({ resourceId: query.resourceId });
  if (query.categoryId) and.push({ resource: { categoryId: query.categoryId } });
  if (query.status !== "all") and.push({ status: query.status });
  if (query.timeframe === "upcoming") and.push({ endTime: { gt: now } });
  if (query.timeframe === "past") and.push({ endTime: { lte: now } });
  // Window filter uses the same half-open overlap rule as booking conflicts.
  if (query.from) and.push({ endTime: { gt: query.from } });
  if (query.to) and.push({ startTime: { lt: query.to } });
  if (query.search) {
    and.push({
      OR: [
        { bookedBy: { contains: query.search, mode: "insensitive" } },
        { purpose: { contains: query.search, mode: "insensitive" } },
        { resource: { name: { contains: query.search, mode: "insensitive" } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export const reservationRepository = {
  /** @param userId when given, only that user's reservations are returned. */
  async findMany(query: ListReservationsQuery, userId?: string, now = new Date()) {
    const where = buildListWhere(query, now, userId);
    const [items, total] = await prisma.$transaction([
      prisma.reservation.findMany({
        where,
        include: reservationInclude,
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: "asc" }],
        ...paginationArgs(query.page, query.pageSize),
      }),
      prisma.reservation.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: string) {
    return prisma.reservation.findUnique({ where: { id }, include: reservationInclude });
  },

  /** Confirmed reservations of one resource that overlap the interval. */
  findBlockingOverlaps(resourceId: string, interval: Interval, excludeId?: string) {
    return prisma.reservation.findMany({
      where: {
        resourceId,
        ...blockingOverlapWhere(interval),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, endTime: true },
    });
  },

  create(data: Prisma.ReservationUncheckedCreateInput) {
    return prisma.reservation.create({ data, include: reservationInclude });
  },

  /**
   * Atomically moves CONFIRMED -> CANCELLED. The status condition in the WHERE
   * clause means two simultaneous cancellations cannot both succeed.
   * Returns false when the reservation was not CONFIRMED any more.
   */
  async cancelIfConfirmed(id: string, reason: string | null, now: Date): Promise<boolean> {
    const result = await prisma.reservation.updateMany({
      where: { id, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledAt: now, cancellationReason: reason },
    });
    return result.count === 1;
  },

  updateDetails(id: string, data: Prisma.ReservationUncheckedUpdateInput) {
    return prisma.reservation.update({ where: { id }, data, include: reservationInclude });
  },
};
