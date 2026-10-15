import { ERROR_CODES, type Portal, type SessionDto, type UserDto } from "@rrms/shared";
import { ApiError } from "@/lib/api-error";
import { createSession, forbidden, type AuthContext } from "@/lib/auth";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/lib/password";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { ensureAdminAccount, getAdminCredentials, isAdminEmail, matchesAdminPassword } from "./admin-account";
import type { LoginInput, SignupInput } from "./auth.schema";

type UserRow = { id: string; name: string; email: string; role: "USER" | "ADMIN"; createdAt: Date };

export function toUserDto(user: UserRow): UserDto {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() };
}

const emailTaken = () =>
  new ApiError(409, ERROR_CODES.EMAIL_TAKEN, "An account with this email already exists. Try logging in instead.");

const invalidCredentials = () => new ApiError(401, ERROR_CODES.INVALID_CREDENTIALS, "Incorrect email or password.");

export interface IssuedSession {
  session: SessionDto;
  token: string;
  expiresAt: Date;
}

async function issue(user: UserRow, portal: Portal): Promise<IssuedSession> {
  const { token, expiresAt } = await createSession(user.id, portal);
  return { token, expiresAt, session: { user: toUserDto(user), portal, expiresAt: expiresAt.toISOString() } };
}

export const authService = {
  /**
   * Only the user website has signup, and it always creates a USER account.
   * The admin account comes from .env (ADMIN_EMAIL / ADMIN_PASSWORD) and its
   * email is reserved, so nobody can register it first.
   */
  async signup(input: SignupInput, portal: Portal): Promise<IssuedSession> {
    if (portal === "admin") {
      throw forbidden("The admin website has no signup. Administrators log in with the account configured on the server.");
    }
    if (isAdminEmail(input.email)) throw emailTaken();
    if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw emailTaken();
    try {
      const user = await prisma.user.create({
        data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: "USER" },
      });
      return issue(user, portal);
    } catch (error) {
      if (isUniqueViolation(error)) throw emailTaken();
      throw error;
    }
  },

  async login(input: LoginInput, portal: Portal): Promise<IssuedSession> {
    if (portal === "admin") {
      // Admin website: only the account configured in .env can log in.
      if (!getAdminCredentials()) throw forbidden("Admin login is not configured on the server (ADMIN_EMAIL / ADMIN_PASSWORD).");
      if (!isAdminEmail(input.email) || !matchesAdminPassword(input.password)) {
        await verifyPassword(input.password, await DUMMY_PASSWORD_HASH); // keep timing uniform
        throw invalidCredentials();
      }
      return issue(await ensureAdminAccount(), portal);
    }

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Always run the hash check so unknown emails take as long as wrong passwords.
    const valid = await verifyPassword(input.password, user?.passwordHash ?? (await DUMMY_PASSWORD_HASH));
    if (!user || !valid) throw invalidCredentials();
    return issue(user, portal);
  },

  async logout(auth: AuthContext | null): Promise<void> {
    if (auth) await prisma.session.deleteMany({ where: { id: auth.sessionId } });
  },

  me(auth: AuthContext): SessionDto {
    return {
      user: toUserDto(auth.user),
      portal: auth.portal,
      expiresAt: auth.expiresAt.toISOString(),
    };
  },
};
