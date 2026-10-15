import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { resourceController } from "@/modules/resources/resource.controller";

type Context = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (request: NextRequest, { params }: Context) =>
  resourceController.get(request, (await params).id),
);

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: Context) =>
  resourceController.update(request, (await params).id),
);

/** Only succeeds for resources without any reservations; otherwise 409 (deactivate instead). */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: Context) =>
  resourceController.remove(request, (await params).id),
);
