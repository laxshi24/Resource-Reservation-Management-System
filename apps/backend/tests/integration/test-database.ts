import path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../../../.env"), quiet: true });

/**
 * Returns TEST_DATABASE_URL after checking it points at a dedicated test
 * database. Integration tests wipe this database, so we refuse to run against
 * anything whose name does not contain "test" (e.g. the development database).
 */
export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Add it to .env (see .env.example).");
  }
  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(databaseName)) {
    throw new Error(`Refusing to run integration tests against "${databaseName}": the name must contain "test".`);
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must be different from DATABASE_URL.");
  }
  return url;
}
