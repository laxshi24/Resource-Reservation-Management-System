import type { ReservationDto } from "@rrms/shared";
import type { Prisma } from "@/generated/prisma/client";

export const reservationInclude = {
  resource: {
    select: {
      id: true,
      name: true,
      location: true,
      isActive: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.ReservationInclude;

export type ReservationWithResource = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>;

export function toReservationDto(reservation: ReservationWithResource): ReservationDto {
  return {
    id: reservation.id,
    resourceId: reservation.resourceId,
    userId: reservation.userId,
    resource: reservation.resource,
    bookedBy: reservation.bookedBy,
    purpose: reservation.purpose,
    startTime: reservation.startTime.toISOString(),
    endTime: reservation.endTime.toISOString(),
    status: reservation.status,
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    cancellationReason: reservation.cancellationReason,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}
