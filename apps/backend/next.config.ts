import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The whole monorepo shares one `.env` file at the repository root.
const repoRoot = path.resolve(process.cwd(), "../..");
// forceReload: Next.js already cached the env of the app folder, so reload from the repo root.
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", { info: () => {}, error: console.error }, true);

const nextConfig: NextConfig = {
  // The shared workspace package ships TypeScript source, so Next.js compiles it.
  transpilePackages: ["@rrms/shared"],
  poweredByHeader: false,
  // The end-to-end tests build into a separate folder so they never overwrite the normal build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
};

export default nextConfig;
