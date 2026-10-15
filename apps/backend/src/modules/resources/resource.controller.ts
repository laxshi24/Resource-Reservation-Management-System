import type { NextRequest } from "next/server";
import { created, noContent, ok, readJson } from "@/lib/api-response";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { searchParamsToObject } from "@/lib/pagination";
import { parseIdParam, parseOrThrow } from "@/lib/validation";
import { createResourceSchema, listResourcesQuerySchema, updateResourceSchema } from "./resource.schema";
import { resourceNotFound, resourceService } from "./resource.service";

/** HTTP layer: parse + validate input, call the service, shape the response. */
export const resourceController = {
  async list(request: NextRequest) {
    const auth = await requireAuth(request);
    const query = parseOrThrow(listResourcesQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
    // Regular users only ever see resources they can book.
    if (!auth.isAdmin) query.status = "active";
    return ok(await resourceService.list(query));
  },

  async get(request: NextRequest, id: string) {
    const auth = await requireAuth(request);
    return ok(await resourceService.getById(parseIdParam(id, resourceNotFound()), auth));
  },

  async create(request: NextRequest) {
    await requireAdmin(request);
    const input = parseOrThrow(createResourceSchema, await readJson(request));
    return created(await resourceService.create(input), "Resource created successfully.");
  },

  async update(request: NextRequest, id: string) {
    await requireAdmin(request);
    const resourceId = parseIdParam(id, resourceNotFound());
    const input = parseOrThrow(updateResourceSchema, await readJson(request));
    return ok(await resourceService.update(resourceId, input), "Resource updated successfully.");
  },

  async remove(request: NextRequest, id: string) {
    await requireAdmin(request);
    await resourceService.delete(parseIdParam(id, resourceNotFound()));
    return noContent();
  },
};
