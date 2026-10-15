import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { authController } from "@/modules/auth/auth.controller";

/** Returns the logged-in user for the calling website, or 401. */
export const GET = withErrorHandling((request: NextRequest) => authController.me(request));
