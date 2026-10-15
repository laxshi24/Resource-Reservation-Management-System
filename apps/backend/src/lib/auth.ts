import { createHash, randomBytes } from "node:crypto";
import { ERROR_CODES, PORTAL_HEADER, PORTALS, SESSION_COOKIE_NAMES, type Portal, type UserRole } from "@rrms/shared";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./api-error";
import { getEnv } from "./env";
import { isAdminEmail } from "@/modules/auth/admin-account";
import { prisma } from "./prisma";

/**
 * Session-based authentication.
 *
 * - Logging in creates a `sessions` row and sets an httpOnly cookie holding a
 *   random 256-bit token. Only the token's SHA-256 hash is stored, so a
 *   database leak does not expose usable session tokens.
 * - There are two websites (user and admin). Each request says which one it
 *   comes from in the `x-portal` header; the API then reads that portal's
 *   cookie. Admin sessions only exist for the administrator configured in
 *   .env (ADMIN_EMAIL / ADMIN_PASSWORD) - the admin website has no signup.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface AuthContext {
  user: AuthUser;
  portal: Portal;
  sessionId: string;
  expiresAt: Date;
  isAdmin: boolean;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getPortal(request: Request): Portal {
  const value = request.headers.get(PORTAL_HEADER)?.toLowerCase();
  return (PORTALS as readonly string[]).includes(value ?? "") ? (value as Portal) : "user";
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, portal: Portal) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, portal: portal === "admin" ? "ADMIN" : "USER", expiresAt },
  });
  // Opportunistic clean-up of this user's expired sessions.
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  return { token, expiresAt, sessionId: session.id };
}

function cookieOptions(expiresAt: Date) {
  const { COOKIE_DOMAIN, NODE_ENV } = getEnv();
  return {
    httpOnly: true, // not readable from JavaScript (mitigates XSS token theft)
    sameSite: "lax" as const, // not sent on cross-site sub-requests (mitigates CSRF)
    secure: NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  };
}

export function setSessionCookie(response: NextResponse, portal: Portal, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAMES[portal], token, cookieOptions(expiresAt));
}

export function clearSessionCookie(response: NextResponse, portal: Portal) {
  response.cookies.set(SESSION_COOKIE_NAMES[portal], "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

function readToken(request: NextRequest, portal: Portal): string | undefined {
  return request.cookies.get(SESSION_COOKIE_NAMES[portal])?.value || undefined;
}

/** Resolves the logged-in user for this request, or null. */
export async function getAuth(request: NextRequest): Promise<AuthContext | null> {
  const portal = getPortal(request);
  const token = readToken(request, portal);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  // The cookie must belong to the portal it was presented to.
  if ((portal === "admin") !== (session.portal === "ADMIN")) return null;
  // An admin session stops working immediately if the account loses the ADMIN role
  // or is no longer the administrator configured in .env (ADMIN_EMAIL).
  if (portal === "admin" && (session.user.role !== "ADMIN" || !isAdminEmail(session.user.email))) return null;

  return {
    user: session.user,
    portal,
    sessionId: session.id,
    expiresAt: session.expiresAt,
    isAdmin: portal === "admin" && session.user.role === "ADMIN",
  };
}

export function unauthenticated() {
  return new ApiError(401, ERROR_CODES.UNAUTHENTICATED, "Please log in to continue.");
}

export function forbidden(message = "You do not have permission to do this.") {
  return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
}

/** Any logged-in user (either website). */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const auth = await getAuth(request);
  if (!auth) throw unauthenticated();
  return auth;
}

/** A logged-in administrator on the admin website. */
export async function requireAdmin(request: NextRequest): Promise<AuthContext> {
  const auth = await requireAuth(request);
  if (!auth.isAdmin) throw forbidden("Administrator access is required.");
  return auth;
}
