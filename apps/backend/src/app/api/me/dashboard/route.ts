import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { searchParamsToObject } from "@/lib/pagination";
import { parseOrThrow } from "@/lib/validation";
import { dashboardQuerySchema } from "@/modules/dashboard/dashboard.schema";
import { myDashboardService } from "@/modules/dashboard/my-dashboard.service";

/** GET /api/me/dashboard?date=YYYY-MM-DD&timeZone=Area/City - the logged-in user's dashboard. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  const query = parseOrThrow(dashboardQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  return ok(await myDashboardService.get(query, auth));
});
