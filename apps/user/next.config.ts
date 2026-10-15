import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The whole monorepo shares one `.env` file at the repository root.
// Loading it here (before the build) lets Next.js inline NEXT_PUBLIC_* values.
const repoRoot = path.resolve(process.cwd(), "../..");
// forceReload: Next.js already cached the env of the app folder, so reload from the repo root.
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", { info: () => {}, error: console.error }, true);

const nextConfig: NextConfig = {
  transpilePackages: ["@rrms/shared", "@rrms/web"],
  // Identifies this website to the API (selects the user session cookie). Not a secret.
  env: { NEXT_PUBLIC_PORTAL: "user" },
  poweredByHeader: false,
  // The end-to-end tests build into a separate folder so they never overwrite the normal build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
};

export default nextConfig;
