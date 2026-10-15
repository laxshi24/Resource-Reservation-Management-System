import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

/**
 * The administrator account is defined in .env (ADMIN_EMAIL / ADMIN_PASSWORD),
 * not created through signup. The database row is kept in sync with .env so
 * that changing the password in .env takes effect at the next login.
 */

export function getAdminCredentials(): { email: string; password: string } | null {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = getEnv();
  return ADMIN_EMAIL && ADMIN_PASSWORD ? { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } : null;
}

export function isAdminEmail(email: string): boolean {
  const admin = getAdminCredentials();
  return admin !== null && admin.email === email.trim().toLowerCase();
}

/** Constant-time comparison so response timing does not reveal the admin password. */
export function matchesAdminPassword(password: string): boolean {
  const admin = getAdminCredentials();
  if (!admin) return false;
  const given = Buffer.from(password);
  const expected = Buffer.from(admin.password);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Creates or updates the admin user so it matches .env. Returns the user row. */
export async function ensureAdminAccount(name = "Administrator") {
  const admin = getAdminCredentials();
  if (!admin) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are not configured.");

  const existing = await prisma.user.findUnique({ where: { email: admin.email } });
  if (!existing) {
    return prisma.user.create({
      data: { email: admin.email, name, role: "ADMIN", passwordHash: await hashPassword(admin.password) },
    });
  }
  const passwordInSync = await verifyPassword(admin.password, existing.passwordHash);
  if (existing.role === "ADMIN" && passwordInSync) return existing;
  return prisma.user.update({
    where: { id: existing.id },
    data: { role: "ADMIN", ...(passwordInSync ? {} : { passwordHash: await hashPassword(admin.password) }) },
  });
}
