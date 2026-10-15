import { PORTAL_HEADER, SESSION_COOKIE_NAMES, type ApiErrorBody, type ApiSuccess, type ValidationIssue } from "@rrms/shared";
import { publicEnv } from "./env";

/**
 * The single place where the websites talk to the backend over HTTP.
 * Works in both Server Components and Client Components.
 *
 * Authentication: the API keeps the session in an httpOnly cookie.
 * - In the browser, `credentials: "include"` makes fetch send that cookie.
 * - On the server (Server Components), there is no browser, so the incoming
 *   request's session cookie is forwarded explicitly.
 * Every request also says which website it comes from (x-portal header), so
 * the API reads the matching cookie (user and admin logins are separate).
 */

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isUnauthenticated() {
    return this.status === 401;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
  /**
   * When the API answers 401 (not logged in / session expired), send the
   * visitor to the login page. Auth endpoints turn this off to handle 401 themselves.
   */
  redirectOnUnauthenticated?: boolean;
}

export interface ApiResult<T> {
  data: T;
  message?: string;
}

function buildUrl(path: string, query?: QueryParams): URL {
  const url = new URL(`${publicEnv.apiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

/** On the server: the visitor's session cookie for this website, to forward to the API. */
async function serverSessionCookie(): Promise<string | undefined> {
  if (typeof window !== "undefined") return undefined;
  try {
    const { cookies } = await import("next/headers");
    const name = SESSION_COOKIE_NAMES[publicEnv.portal];
    const value = (await cookies()).get(name)?.value;
    return value ? `${name}=${encodeURIComponent(value)}` : undefined;
  } catch {
    return undefined; // not inside a request (e.g. build time or unit tests)
  }
}

async function redirectToLogin(): Promise<void> {
  if (typeof window === "undefined") {
    const { redirect } = await import("next/navigation");
    redirect("/login"); // throws; Next.js turns it into a redirect response
  } else if (!window.location.pathname.startsWith("/login")) {
    // A full page load (not router.push) on purpose: this runs outside React and
    // discards all client state that belonged to the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
}

function isApiSuccess<T>(payload: unknown): payload is ApiSuccess<T> {
  return typeof payload === "object" && payload !== null && (payload as { success?: unknown }).success === true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, query, signal, redirectOnUnauthenticated = true } = options;

  const headers: Record<string, string> = { [PORTAL_HEADER]: publicEnv.portal };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const cookie = await serverSessionCookie();
  if (cookie) headers.cookie = cookie;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      // Reservation data changes constantly; always ask the backend for fresh data.
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the server. Check that the backend is running and try again.",
    );
  }

  if (response.status === 204) return { data: undefined as T };

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response (e.g. a proxy error page); handled below.
  }

  if (response.status === 401 && redirectOnUnauthenticated) await redirectToLogin();

  if (!response.ok || !isApiSuccess<T>(payload)) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? `The server responded with an unexpected error (HTTP ${response.status}).`,
      error?.details ?? [],
    );
  }

  return { data: payload.data, message: payload.message };
}

/** A user-friendly message for any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
