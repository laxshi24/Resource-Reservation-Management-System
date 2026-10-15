import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env automatically; load the shared root .env explicitly.
config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` does not need a database, so an empty fallback keeps
    // `npm install` working on machines that have not created .env yet.
    url: process.env.DATABASE_URL ?? "",
  },
});
