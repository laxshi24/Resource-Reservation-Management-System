import type { ApiErrorBody, ApiSuccess, SessionDto } from "@rrms/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { account, TEST_PASSWORD } from "../fixtures/auth";
import { resetDatabase } from "../fixtures/db";
import { makeRequest, readBody } from "../fixtures/http";

const asPortal = (portal: "user" | "admin") => ({ as: "none" as const, headers: { "x-portal": portal } });

function sessionCookie(response: Response, name: string): string | undefined {
  const header = response.headers.get("set-cookie") ?? "";
  return header.match(new RegExp(`${name}=([^;]*)`))?.[1];
}

describe("Auth API", () => {
  beforeEach(resetDatabase);

  describe("POST /api/auth/signup", () => {
    it("creates a USER account on the user website and logs it in with an httpOnly cookie", async () => {
      const response = await signup(
        makeRequest("/api/auth/signup", {
          method: "POST",
          body: { name: " New Person ", email: "New.Person@Example.com", password: "Secret123" },
          ...asPortal("user"),
        }),
      );
      expect(response.status).toBe(201);
      const body = await readBody<ApiSuccess<SessionDto>>(response);
      expect(body.data.user).toMatchObject({ name: "New Person", email: "new.person@example.com", role: "USER" });
      expect(body.data.portal).toBe("user");

      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain("rrms_session=");
      expect(setCookie.toLowerCase()).toContain("httponly");
      expect(setCookie.toLowerCase()).toContain("samesite=lax");

      // Only the hash of the token is stored, and the password is hashed.
      const token = sessionCookie(response, "rrms_session")!;
      const user = await prisma.user.findUniqueOrThrow({ where: { email: "new.person@example.com" } });
      expect(user.passwordHash).toMatch(/^scrypt\$/);
      expect(user.passwordHash).not.toContain("Secret123");
      expect(await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } })).not.toBeNull();
    });

    it("validates input and rejects duplicate emails (case-insensitive)", async () => {
      const invalid = await signup(
        makeRequest("/api/auth/signup", { method: "POST", body: { name: "A", email: "nope", password: "short" }, ...asPortal("user") }),
      );
      expect(invalid.status).toBe(400);
      expect((await readBody<ApiErrorBody>(invalid)).error.details?.map((d) => d.path)).toEqual(
        expect.arrayContaining(["name", "email", "password"]),
      );

      const duplicate = await signup(
        makeRequest("/api/auth/signup", {
          method: "POST",
          body: { name: "Copy Cat", email: account("user").email.toUpperCase(), password: "Secret123" },
          ...asPortal("user"),
        }),
      );
      expect(duplicate.status).toBe(409);
      expect((await readBody<ApiErrorBody>(duplicate)).error.code).toBe("EMAIL_TAKEN");
    });

    it("has no signup on the admin website", async () => {
      const response = await signup(
        makeRequest("/api/auth/signup", {
          method: "POST",
          body: { name: "Wannabe Admin", email: "boss@example.com", password: "Secret123" },
          ...asPortal("admin"),
        }),
      );
      expect(response.status).toBe(403);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(await prisma.user.count({ where: { email: "boss@example.com" } })).toBe(0);
    });

    it("reserves the administrator email and rejects unknown fields", async () => {
      const takeover = await signup(
        makeRequest("/api/auth/signup", {
          method: "POST",
          body: { name: "Impostor", email: "ADMIN@test.local", password: "Secret123" },
          ...asPortal("user"),
        }),
      );
      expect(takeover.status).toBe(409);

      const extraField = await signup(
        makeRequest("/api/auth/signup", {
          method: "POST",
          body: { name: "Sneaky", email: "sneaky@example.com", password: "Secret123", role: "ADMIN" },
          ...asPortal("user"),
        }),
      );
      expect(extraField.status).toBe(400);
    });
  });

  describe("Admin website login (account from ADMIN_EMAIL / ADMIN_PASSWORD)", () => {
    const adminLogin = (email: string, password: string) =>
      login(makeRequest("/api/auth/login", { method: "POST", body: { email, password }, ...asPortal("admin") }));

    it("only accepts the configured administrator", async () => {
      // Another account with the ADMIN role (e.g. promoted directly in the database) is still refused.
      await prisma.user.update({ where: { id: account("otherUser").id }, data: { role: "ADMIN" } });
      const otherAdmin = await adminLogin(account("otherUser").email, TEST_PASSWORD);
      expect(otherAdmin.status).toBe(401);
      expect(otherAdmin.headers.get("set-cookie")).toBeNull();

      const regularUser = await adminLogin(account("user").email, TEST_PASSWORD);
      expect(regularUser.status).toBe(401);

      const wrongPassword = await adminLogin("admin@test.local", "WrongPassword1");
      expect(wrongPassword.status).toBe(401);

      const configured = await adminLogin("Admin@Test.local", "Password123");
      expect(configured.status).toBe(200);
      expect(configured.headers.get("set-cookie")).toContain("rrms_admin_session=");
    });

    it("creates the administrator account from .env on first login", async () => {
      await prisma.session.deleteMany({ where: { userId: account("admin").id } });
      await prisma.user.delete({ where: { id: account("admin").id } });

      const response = await adminLogin("admin@test.local", "Password123");
      expect(response.status).toBe(200);
      const created = await prisma.user.findUniqueOrThrow({ where: { email: "admin@test.local" } });
      expect(created.role).toBe("ADMIN");
      expect(created.passwordHash).toMatch(/^scrypt\$/);
    });

    it("follows the password in .env (database hash is re-synced)", async () => {
      const before = await prisma.user.findUniqueOrThrow({ where: { email: "admin@test.local" } });
      await prisma.user.update({ where: { id: before.id }, data: { passwordHash: "scrypt$16384$8$1$00$00" } });

      expect((await adminLogin("admin@test.local", "Password123")).status).toBe(200);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: before.id } });
      expect(after.passwordHash).not.toBe("scrypt$16384$8$1$00$00");
    });

    it("stops accepting an admin session when the account is no longer the configured admin", async () => {
      expect((await me(makeRequest("/api/auth/me", { as: "admin" }))).status).toBe(200);
      await prisma.user.update({ where: { id: account("admin").id }, data: { email: "former.admin@test.local" } });
      expect((await me(makeRequest("/api/auth/me", { as: "admin" }))).status).toBe(401);
    });
  });

  describe("POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout", () => {
    it("logs in with valid credentials and returns the current user", async () => {
      const response = await login(
        makeRequest("/api/auth/login", {
          method: "POST",
          body: { email: account("user").email, password: TEST_PASSWORD },
          ...asPortal("user"),
        }),
      );
      expect(response.status).toBe(200);
      const token = sessionCookie(response, "rrms_session")!;

      const current = await me(makeRequest("/api/auth/me", { as: "none", headers: { cookie: `rrms_session=${token}`, "x-portal": "user" } }));
      expect(current.status).toBe(200);
      expect((await readBody<ApiSuccess<SessionDto>>(current)).data.user.email).toBe(account("user").email);
    });

    it("gives the same error for an unknown email and a wrong password", async () => {
      for (const body of [
        { email: "nobody@example.com", password: TEST_PASSWORD },
        { email: account("user").email, password: "WrongPassword1" },
      ]) {
        const response = await login(makeRequest("/api/auth/login", { method: "POST", body, ...asPortal("user") }));
        expect(response.status).toBe(401);
        expect((await readBody<ApiErrorBody>(response)).error).toEqual({
          code: "INVALID_CREDENTIALS",
          message: "Incorrect email or password.",
        });
      }
    });

    it("refuses admin-website login for regular users", async () => {
      const response = await login(
        makeRequest("/api/auth/login", {
          method: "POST",
          body: { email: account("user").email, password: TEST_PASSWORD },
          ...asPortal("admin"),
        }),
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("lets admins use both websites with separate sessions", async () => {
      for (const portal of ["admin", "user"] as const) {
        const response = await login(
          makeRequest("/api/auth/login", {
            method: "POST",
            body: { email: account("admin").email, password: TEST_PASSWORD },
            ...asPortal(portal),
          }),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("set-cookie")).toContain(portal === "admin" ? "rrms_admin_session=" : "rrms_session=");
      }
    });

    it("returns 401 from /me without a valid session, and logout revokes the session", async () => {
      expect((await me(makeRequest("/api/auth/me", { as: "none" }))).status).toBe(401);
      expect((await me(makeRequest("/api/auth/me", { as: "user" }))).status).toBe(200);

      const out = await logout(makeRequest("/api/auth/logout", { method: "POST", as: "user" }));
      expect(out.status).toBe(200);
      expect(out.headers.get("set-cookie")).toMatch(/rrms_session=;/);
      expect((await me(makeRequest("/api/auth/me", { as: "user" }))).status).toBe(401);
    });

    it("does not accept a user-website cookie on the admin website, or expired sessions", async () => {
      const userToken = account("admin"); // an admin's *admin* session...
      const crossPortal = await me(
        makeRequest("/api/auth/me", { as: "none", headers: { cookie: `rrms_admin_session=${userToken.token}`, "x-portal": "user" } }),
      );
      expect(crossPortal.status).toBe(401); // ...is not valid on the user website

      await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await me(makeRequest("/api/auth/me", { as: "admin" }))).status).toBe(401);
    });
  });
});
