import { ERROR_CODES, type Paginated, type ReservationDto } from "@rrms/shared";
import { ApiError } from "@/lib/api-error";
import type { AuthContext } from "@/lib/auth";
import { paginationMeta } from "@/lib/pagination";
import { mentionsConstraint } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { NO_OVERLAP_CONSTRAINT } from "./reservation-overlap";
import { reservationRepository } from "./reservation.repository";
import type {
  CancelReservationInput,
  CreateReservationInput,
  ListReservationsQuery,
  UpdateReservationInput,
} from "./reservation.schema";
import { toReservationDto, type ReservationWithResource } from "./reservation.types";

/** Who is acting. Admins can act on any reservation; users only on their own. */
export type Actor = Pick<AuthContext, "isAdmin" | "user">;

export const reservationNotFound = () =>
  ApiError.notFound(ERROR_CODES.RESERVATION_NOT_FOUND, "The requested reservation does not exist.");

export const reservationConflict = () =>
  ApiError.conflict(
    ERROR_CODES.RESERVATION_CONFLICT,
    "This resource is already reserved during the selected time. Please choose a different time or resource.",
  );

const alreadyCancelled = () =>
  ApiError.conflict(ERROR_CODES.RESERVATION_ALREADY_CANCELLED, "This reservation has already been cancelled.");

const alreadyEnded = (action: string) =>
  ApiError.conflict(ERROR_CODES.RESERVATION_ALREADY_ENDED, `This reservation has already ended and cannot be ${action}.`);

/**
 * Status rules (the only transition is CONFIRMED -> CANCELLED):
 * - Only CONFIRMED reservations that have not ended can be cancelled or edited.
 * - A CANCELLED reservation is final; rebooking means creating a new reservation.
 */
function assertModifiable(reservation: ReservationWithResource, action: string, now: Date) {
  if (reservation.status === "CANCELLED") throw alreadyCancelled();
  if (reservation.endTime <= now) throw alreadyEnded(action);
}

/** Loads a reservation the actor may see. Other people's bookings look "not found" to users. */
async function findVisible(id: string, actor: Actor): Promise<ReservationWithResource> {
  const reservation = await reservationRepository.findById(id);
  if (!reservation || (!actor.isAdmin && reservation.userId !== actor.user.id)) throw reservationNotFound();
  return reservation;
}

export const reservationService = {
  async list(query: ListReservationsQuery, actor: Actor): Promise<Paginated<ReservationDto>> {
    const { items, total } = await reservationRepository.findMany(query, actor.isAdmin ? undefined : actor.user.id);
    return { items: items.map(toReservationDto), pagination: paginationMeta(query.page, query.pageSize, total) };
  },

  async getById(id: string, actor: Actor): Promise<ReservationDto> {
    return toReservationDto(await findVisible(id, actor));
  },

  async create(input: CreateReservationInput, actor: Actor): Promise<ReservationDto> {
    const resource = await prisma.resource.findUnique({
      where: { id: input.resourceId },
      select: { id: true, name: true, isActive: true },
    });
    if (!resource) {
      throw ApiError.notFound(ERROR_CODES.RESOURCE_NOT_FOUND, "The selected resource does not exist.");
    }
    if (!resource.isActive) {
      throw ApiError.conflict(ERROR_CODES.RESOURCE_INACTIVE, `"${resource.name}" is inactive and cannot be reserved.`);
    }

    // Friendly pre-check. It is NOT relied upon for correctness: two concurrent
    // requests could both pass it. The database exclusion constraint is the
    // real guarantee, and its violation is translated to the same 409 below.
    const overlaps = await reservationRepository.findBlockingOverlaps(resource.id, {
      start: input.startTime,
      end: input.endTime,
    });
    if (overlaps.length > 0) throw reservationConflict();

    try {
      const reservation = await reservationRepository.create({
        resourceId: resource.id,
        userId: actor.user.id,
        // Admins may book on behalf of someone else; users always book under their own name.
        bookedBy: (actor.isAdmin && input.bookedBy) || actor.user.name,
        purpose: input.purpose,
        startTime: input.startTime,
        endTime: input.endTime,
      });
      return toReservationDto(reservation);
    } catch (error) {
      if (mentionsConstraint(error, NO_OVERLAP_CONSTRAINT)) throw reservationConflict();
      throw error;
    }
  },

  async cancel(id: string, input: CancelReservationInput, actor: Actor): Promise<ReservationDto> {
    const now = new Date();
    const reservation = await findVisible(id, actor);
    assertModifiable(reservation, "cancelled", now);

    const cancelled = await reservationRepository.cancelIfConfirmed(id, input.reason, now);
    if (!cancelled) throw alreadyCancelled(); // someone else cancelled it a moment ago

    return toReservationDto((await reservationRepository.findById(id))!);
  },

  async updateDetails(id: string, input: UpdateReservationInput, actor: Actor): Promise<ReservationDto> {
    const reservation = await findVisible(id, actor);
    if (!actor.isAdmin && input.bookedBy !== undefined) {
      throw ApiError.validation("Only administrators can change who a reservation is for.", [
        { path: "bookedBy", message: "Not allowed" },
      ]);
    }
    assertModifiable(reservation, "edited", new Date());
    return toReservationDto(await reservationRepository.updateDetails(id, input));
  },
};
