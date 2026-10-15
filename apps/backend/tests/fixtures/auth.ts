import { SESSION_COOKIE_NAMES, type Portal } from "@rrms/shared";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

/** Password used by every test account. */
export const TEST_PASSWORD = "Password123";

export type TestIdentity = "admin" | "user" | "otherUser";

interface Account {
  id: string;
  name: string;
  email: string;
  token: string;
  portal: Portal;
}

const accounts = new Map<TestIdentity, Account>();
let passwordHash: Promise<string> | undefined;

/** Creates an admin and two regular users, each with a live session. Called after every reset. */
export async function createTestAccounts() {
  passwordHash ??= hashPassword(TEST_PASSWORD); // hashing is slow by design, so do it once
  const hash = await passwordHash;
  const specs: Array<[TestIdentity, string, "ADMIN" | "USER", Portal]> = [
    ["admin", "Test Admin", "ADMIN", "admin"],
    ["user", "Test User", "USER", "user"],
    ["otherUser", "Other User", "USER", "user"],
  ];
  accounts.clear();
  for (const [identity, name, role, portal] of specs) {
    const user = await prisma.user.create({
      data: { name, email: `${identity.toLowerCase()}@test.local`, passwordHash: hash, role },
    });
    const { token } = await createSession(user.id, portal);
    accounts.set(identity, { id: user.id, name, email: user.email, token, portal });
  }
}

export function account(identity: TestIdentity): Account {
  const found = accounts.get(identity);
  if (!found) throw new Error("Test accounts not created - call resetDatabase() first.");
  return found;
}

/** Cookie + portal headers that authenticate a request as `identity`. */
export function authHeaders(identity: TestIdentity): Record<string, string> {
  const { token, portal } = account(identity);
  return { cookie: `${SESSION_COOKIE_NAMES[portal]}=${token}`, "x-portal": portal };
}
