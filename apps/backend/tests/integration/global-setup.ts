import { execSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { getTestDatabaseUrl } from "./test-database";

/**
 * Runs once before the integration suite:
 * 1. Empties the dedicated test database (drops and recreates the `public` schema).
 * 2. Applies every versioned migration with `prisma migrate deploy`.
 *
 * Step 2 doubles as the "migrations work on a fresh database" check: if any
 * migration (including the hand-written SQL) fails on a clean database, the
 * whole suite fails here.
 */
export default async function globalSetup() {
  const url = getTestDatabaseUrl();

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
