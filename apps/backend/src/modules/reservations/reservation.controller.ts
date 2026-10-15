import type { NextRequest } from "next/server";
import { created, ok, readJson } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { searchParamsToObject } from "@/lib/pagination";
import { parseIdParam, parseOrThrow } from "@/lib/validation";
import {
  cancelReservationSchema,
  createReservationSchema,
  listReservationsQuerySchema,
  updateReservationSchema,
} from "./reservation.schema";
import { reservationNotFound, reservationService } from "./reservation.service";

/** Reads an optional JSON body: an empty body is treated as `{}`. */
async function readOptionalJson(request: NextRequest): Promise<unknown> {
  const text = await request.clone().text();
  return text.trim() === "" ? {} : readJson(request);
}

/**
 * Every reservation endpoint requires a logged-in user. Admins (on the admin
 * website) see and manage all reservations; users only their own.
 */
export const reservationController = {
  async list(request: NextRequest) {
    const actor = await requireAuth(request);
    const query = parseOrThrow(listReservationsQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
    return ok(await reservationService.list(query, actor));
  },

  async get(request: NextRequest, id: string) {
    const actor = await requireAuth(request);
    return ok(await reservationService.getById(parseIdParam(id, reservationNotFound()), actor));
  },

  async create(request: NextRequest) {
    const actor = await requireAuth(request);
    const input = parseOrThrow(createReservationSchema, await readJson(request));
    return created(await reservationService.create(input, actor), "Reservation confirmed.");
  },

  async update(request: NextRequest, id: string) {
    const actor = await requireAuth(request);
    const reservationId = parseIdParam(id, reservationNotFound());
    const input = parseOrThrow(updateReservationSchema, await readJson(request));
    return ok(await reservationService.updateDetails(reservationId, input, actor), "Reservation updated.");
  },

  async cancel(request: NextRequest, id: string) {
    const actor = await requireAuth(request);
    const reservationId = parseIdParam(id, reservationNotFound());
    const input = parseOrThrow(cancelReservationSchema, await readOptionalJson(request));
    return ok(await reservationService.cancel(reservationId, input, actor), "Reservation cancelled.");
  },
};
