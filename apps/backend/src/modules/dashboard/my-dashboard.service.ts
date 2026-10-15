import { zonedDayRange, type MyDashboardDto } from "@rrms/shared";
import type { AuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockingOverlapWhere } from "@/modules/reservations/reservation-overlap";
import { reservationInclude, toReservationDto } from "@/modules/reservations/reservation.types";
import type { DashboardQuery } from "./dashboard.schema";
import { availableNowWhere } from "./dashboard.service";

/** The user website's dashboard: organisation-wide availability plus the user's own bookings. */
export const myDashboardService = {
  async get(query: DashboardQuery, auth: Pick<AuthContext, "user">): Promise<MyDashboardDto> {
    const now = new Date();
    const day = zonedDayRange(query.date, query.timeZone);
    const mine = { userId: auth.user.id };
    const onDay = { ...mine, ...blockingOverlapWhere(day) };
    const upcoming = { ...mine, status: "CONFIRMED" as const, startTime: { gt: now } };

    const [activeResources, availableNow, myOnDateCount, myUpcomingCount, myOnDate, myUpcoming] =
      await prisma.$transaction([
        prisma.resource.count({ where: { isActive: true } }),
        prisma.resource.count({ where: availableNowWhere(now) }),
        prisma.reservation.count({ where: onDay }),
        prisma.reservation.count({ where: upcoming }),
        prisma.reservation.findMany({
          where: onDay,
          include: reservationInclude,
          orderBy: [{ startTime: "asc" }, { id: "asc" }],
          take: 10,
        }),
        prisma.reservation.findMany({
          where: upcoming,
          include: reservationInclude,
          orderBy: [{ startTime: "asc" }, { id: "asc" }],
          take: 5,
        }),
      ]);

    return {
      date: query.date,
      timeZone: query.timeZone,
      totals: { activeResources, availableNow, myReservationsOnDate: myOnDateCount, myUpcoming: myUpcomingCount },
      myReservationsOnDate: myOnDate.map(toReservationDto),
      myUpcoming: myUpcoming.map(toReservationDto),
    };
  },
};
