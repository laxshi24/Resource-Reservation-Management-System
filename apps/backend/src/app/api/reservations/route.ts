import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { reservationController } from "@/modules/reservations/reservation.controller";

export const GET = withErrorHandling((request: NextRequest) => reservationController.list(request));
export const POST = withErrorHandling((request: NextRequest) => reservationController.create(request));
