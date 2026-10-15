import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { searchParamsToObject } from "@/lib/pagination";
import { parseOrThrow } from "@/lib/validation";
import { listUsersQuerySchema, userService } from "@/modules/users/user.service";

/** GET /api/users?search=&role=&page=&pageSize= - admin website only. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin(request);
  const query = parseOrThrow(listUsersQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  return ok(await userService.list(query));
});
