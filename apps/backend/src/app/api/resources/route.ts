import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { resourceController } from "@/modules/resources/resource.controller";

export const GET = withErrorHandling((request: NextRequest) => resourceController.list(request));
export const POST = withErrorHandling((request: NextRequest) => resourceController.create(request));
