import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { reservationController } from "@/modules/reservations/reservation.controller";

type Context = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (request: NextRequest, { params }: Context) =>
  reservationController.get(request, (await params).id),
);

/** Only `bookedBy` and `purpose` can be changed. Status changes use POST /cancel. */
export const PATCH = withErrorHandling(async (request: NextRequest, { params }: Context) =>
  reservationController.update(request, (await params).id),
);
