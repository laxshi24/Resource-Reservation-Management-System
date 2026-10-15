import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { resourceCategoryService } from "@/modules/resource-categories/resource-category.service";

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireAuth(request);
  return ok(await resourceCategoryService.list());
});
