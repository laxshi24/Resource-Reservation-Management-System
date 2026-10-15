import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS for the API.
 *
 * The user site (http://localhost:3000), admin site (http://localhost:3001)
 * and API (http://localhost:4000) are different origins, so browsers require
 * CORS headers. Only the origins listed in FRONTEND_ORIGIN are allowed - never
 * "*" (which browsers also forbid together with credentials/cookies).
 *
 * (Next.js 16 renamed `middleware.ts` to `proxy.ts`; this is that file.)
 */
function allowedOrigins(): string[] {
  return (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Portal",
    // Allows the browser to send/receive the httpOnly session cookie.
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowed = origin !== null && allowedOrigins().includes(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: isAllowed ? corsHeaders(origin) : { Vary: "Origin" } });
  }

  const response = NextResponse.next();
  if (isAllowed) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
