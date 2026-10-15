import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { searchParamsToObject } from "@/lib/pagination";
import { parseOrThrow } from "@/lib/validation";
import { dashboardQuerySchema } from "@/modules/dashboard/dashboard.schema";
import { dashboardService } from "@/modules/dashboard/dashboard.service";

/** GET /api/dashboard?date=YYYY-MM-DD&timeZone=Area/City - admin website only. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin(request);
  const query = parseOrThrow(dashboardQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  return ok(await dashboardService.get(query));
});
