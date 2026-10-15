import { execSync } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";
import { config, parse } from "dotenv";
import { Client } from "pg";

config({ path: path.resolve(__dirname, "../.env"), quiet: true });

/**
 * Prepares the dedicated end-to-end database: empties it, applies all
 * migrations and loads the seed data (categories + sample resources).
 *
 * Run by the backend web server command in playwright.config.ts BEFORE the
 * server starts (Playwright launches web servers before any globalSetup).
 */
async function prepareDatabase() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL is not set. Add it to .env (see .env.example).");
  const databaseName = new URL(url).pathname.slice(1);
  // Compare with the development DATABASE_URL from .env (process.env.DATABASE_URL is overridden for the e2e server).
  const envFile = path.resolve(__dirname, "../.env");
  let devUrl: string | undefined;
  try {
    devUrl = parse(readFileSync(envFile)).DATABASE_URL;
  } catch {
    devUrl = undefined; // no .env file: variables come from the environment (e.g. CI)
  }
  if (!/e2e|test/i.test(databaseName) || url === devUrl) {
    throw new Error(`Refusing to reset "${databaseName}": use a dedicated database whose name contains "e2e".`);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  const backendDir = path.resolve(__dirname, "../apps/backend");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { cwd: backendDir, env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { cwd: backendDir, env, stdio: "pipe" });
}

prepareDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
