import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { authController } from "@/modules/auth/auth.controller";

export const POST = withErrorHandling((request: NextRequest) => authController.logout(request));
