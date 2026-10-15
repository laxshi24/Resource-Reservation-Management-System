import type { AvailabilityDto, AvailabilityItemDto, AvailabilityState } from "@rrms/shared";
import type { AuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockingOverlapWhere } from "@/modules/reservations/reservation-overlap";
import { resourceInclude, toResourceDto } from "@/modules/resources/resource.types";
import type { AvailabilityQuery } from "./availability.schema";

const STATE_ORDER: Record<AvailabilityState, number> = { AVAILABLE: 0, OCCUPIED: 1, INACTIVE: 2 };

/**
 * Availability is computed from the database at request time: a resource is
 * OCCUPIED when it has at least one CONFIRMED reservation overlapping the
 * requested half-open window [startTime, endTime) - the exact rule the
 * exclusion constraint enforces - and INACTIVE when it has been deactivated.
 */
export const availabilityService = {
  /** Users see when a resource is busy, but not who booked it (unless it was them). */
  async check(query: AvailabilityQuery, actor: Pick<AuthContext, "isAdmin" | "user">): Promise<AvailabilityDto> {
    const interval = { start: query.startTime, end: query.endTime };

    const resources = await prisma.resource.findMany({
      where: {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        // Inactive resources are only relevant to administrators.
        ...(actor.isAdmin ? {} : { isActive: true }),
      },
      include: {
        ...resourceInclude,
        reservations: {
          where: blockingOverlapWhere(interval),
          orderBy: { startTime: "asc" },
          select: { id: true, userId: true, bookedBy: true, startTime: true, endTime: true },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    const items: AvailabilityItemDto[] = resources
      .map(({ reservations, ...resource }) => {
        const state: AvailabilityState = !resource.isActive
          ? "INACTIVE"
          : reservations.length > 0
            ? "OCCUPIED"
            : "AVAILABLE";
        return {
          resource: toResourceDto(resource),
          state,
          conflicts: reservations.map((reservation) => {
            const isMine = reservation.userId === actor.user.id;
            return {
              id: reservation.id,
              bookedBy: actor.isAdmin || isMine ? reservation.bookedBy : "Reserved",
              isMine,
              startTime: reservation.startTime.toISOString(),
              endTime: reservation.endTime.toISOString(),
            };
          }),
        };
      })
      .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]); // stable: keeps name order within a state

    const count = (state: AvailabilityState) => items.filter((item) => item.state === state).length;
    return {
      startTime: query.startTime.toISOString(),
      endTime: query.endTime.toISOString(),
      summary: {
        total: items.length,
        available: count("AVAILABLE"),
        occupied: count("OCCUPIED"),
        inactive: count("INACTIVE"),
      },
      items,
    };
  },
};
