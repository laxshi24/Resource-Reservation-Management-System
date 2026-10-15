import { afterAll } from "vitest";
import { getTestDatabaseUrl } from "./test-database";

// Point the application's Prisma client at the test database before any app module loads.
process.env.DATABASE_URL = getTestDatabaseUrl();
// The administrator account (normally from .env) - matches the "admin" test account.
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "Password123";

afterAll(async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
});
