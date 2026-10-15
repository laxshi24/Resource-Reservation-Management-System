import type { NextRequest } from "next/server";
import { created, ok, readJson } from "@/lib/api-response";
import { clearSessionCookie, getAuth, getPortal, requireAuth, setSessionCookie } from "@/lib/auth";
import { parseOrThrow } from "@/lib/validation";
import { loginSchema, signupSchema } from "./auth.schema";
import { authService } from "./auth.service";

export const authController = {
  async signup(request: NextRequest) {
    const portal = getPortal(request);
    const input = parseOrThrow(signupSchema, await readJson(request));
    const { session, token, expiresAt } = await authService.signup(input, portal);
    const response = created(session, "Account created. You are now logged in.");
    setSessionCookie(response, portal, token, expiresAt);
    return response;
  },

  async login(request: NextRequest) {
    const portal = getPortal(request);
    const input = parseOrThrow(loginSchema, await readJson(request));
    const { session, token, expiresAt } = await authService.login(input, portal);
    const response = ok(session, "Logged in successfully.");
    setSessionCookie(response, portal, token, expiresAt);
    return response;
  },

  async logout(request: NextRequest) {
    await authService.logout(await getAuth(request));
    const response = ok(null, "Logged out.");
    clearSessionCookie(response, getPortal(request));
    return response;
  },

  async me(request: NextRequest) {
    return ok(authService.me(await requireAuth(request)));
  },
};
