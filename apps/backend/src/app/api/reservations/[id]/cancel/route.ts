import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { reservationController } from "@/modules/reservations/reservation.controller";

type Context = { params: Promise<{ id: string }> };

/** CONFIRMED -> CANCELLED. Optional body: { "reason": "..." }. */
export const POST = withErrorHandling(async (request: NextRequest, { params }: Context) =>
  reservationController.cancel(request, (await params).id),
);
