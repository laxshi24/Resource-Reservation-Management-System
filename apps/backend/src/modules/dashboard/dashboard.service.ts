import { zonedDayRange, type DashboardDto } from "@rrms/shared";
import { prisma } from "@/lib/prisma";
import { blockingOverlapWhere } from "@/modules/reservations/reservation-overlap";
import { reservationInclude, toReservationDto } from "@/modules/reservations/reservation.types";
import type { DashboardQuery } from "./dashboard.schema";

/** Active resources with no confirmed booking covering this instant. */
export function availableNowWhere(now: Date) {
  return {
    isActive: true,
    reservations: { none: { status: "CONFIRMED" as const, startTime: { lte: now }, endTime: { gt: now } } },
  };
}

/** Aggregates for the dashboard - every number is a live database count. */
export const dashboardService = {
  async get(query: DashboardQuery): Promise<DashboardDto> {
    const now = new Date();
    const day = zonedDayRange(query.date, query.timeZone);
    const onDay = blockingOverlapWhere(day); // confirmed bookings overlapping the selected day

    const [
      activeResources,
      inactiveResources,
      reservationsOnDate,
      upcomingConfirmed,
      cancelledTotal,
      availableNow,
      totalUsers,
      categories,
      todays,
      upcoming,
      recent,
    ] = await prisma.$transaction([
      prisma.resource.count({ where: { isActive: true } }),
      prisma.resource.count({ where: { isActive: false } }),
      prisma.reservation.count({ where: onDay }),
      prisma.reservation.count({ where: { status: "CONFIRMED", startTime: { gt: now } } }),
      prisma.reservation.count({ where: { status: "CANCELLED" } }),
      prisma.resource.count({ where: availableNowWhere(now) }),
      prisma.user.count(),
      prisma.resourceCategory.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, _count: { select: { resources: { where: { isActive: true } } } } },
      }),
      prisma.reservation.findMany({
        where: onDay,
        include: reservationInclude,
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        take: 8,
      }),
      prisma.reservation.findMany({
        where: { status: "CONFIRMED", startTime: { gt: now } },
        include: reservationInclude,
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        take: 5,
      }),
      prisma.reservation.findMany({
        include: reservationInclude,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 5,
      }),
    ]);

    return {
      date: query.date,
      timeZone: query.timeZone,
      totals: {
        activeResources,
        inactiveResources,
        reservationsOnDate,
        upcomingConfirmed,
        cancelledTotal,
        availableNow,
        totalUsers,
      },
      categoryBreakdown: categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        activeResources: category._count.resources,
      })),
      todaysReservations: todays.map(toReservationDto),
      upcomingReservations: upcoming.map(toReservationDto),
      recentReservations: recent.map(toReservationDto),
    };
  },
};
