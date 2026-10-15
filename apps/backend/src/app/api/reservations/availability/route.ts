import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { searchParamsToObject } from "@/lib/pagination";
import { parseOrThrow } from "@/lib/validation";
import { availabilityQuerySchema } from "@/modules/availability/availability.schema";
import { availabilityService } from "@/modules/availability/availability.service";

/** GET /api/reservations/availability?startTime=...&endTime=...&categoryId=... */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const actor = await requireAuth(request);
  const query = parseOrThrow(availabilityQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  return ok(await availabilityService.check(query, actor));
});
