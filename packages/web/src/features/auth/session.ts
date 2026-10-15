import "server-only";
import type { SessionDto } from "@rrms/shared";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ApiClientError } from "../../lib/api-client";
import { authApi } from "./api";

/**
 * The logged-in user for the current request (Server Components only), or
 * null. Cached per request so layouts and pages share one API call.
 */
export const getCurrentSession = cache(async (): Promise<SessionDto | null> => {
  try {
    return (await authApi.me()).data;
  } catch (error) {
    if (error instanceof ApiClientError && error.isUnauthenticated) return null;
    throw error;
  }
});

/** Redirects to the login page when nobody is logged in. */
export async function requireSession(): Promise<SessionDto> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

/** For the login/signup pages: logged-in visitors go straight to the dashboard. */
export async function redirectIfLoggedIn(): Promise<void> {
  if (await getCurrentSession()) redirect("/");
}
