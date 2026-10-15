import { NextRequest } from "next/server";
import { authHeaders, type TestIdentity } from "./auth";

const BASE = "http://localhost:4000";

interface RequestInit {
  method?: string;
  body?: unknown;
  rawBody?: string;
  /** Who sends the request. Defaults to the administrator; "none" sends no session. */
  as?: TestIdentity | "none";
  headers?: Record<string, string>;
}

/** Builds a NextRequest so route handlers can be called directly in tests. */
export function makeRequest(path: string, init: RequestInit = {}) {
  const body = init.rawBody ?? (init.body === undefined ? undefined : JSON.stringify(init.body));
  const identity = init.as ?? "admin";
  return new NextRequest(new URL(path, BASE), {
    method: init.method ?? "GET",
    body,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(identity === "none" ? {} : authHeaders(identity)),
      ...init.headers,
    },
  });
}

/** Route handler context with Next.js 16's async `params`. */
export function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

export async function readBody<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
