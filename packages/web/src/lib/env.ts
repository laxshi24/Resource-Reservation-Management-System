import { isValidTimeZone, PORTALS } from "@rrms/shared";
import { z } from "zod";

/**
 * Public frontend configuration. Only NEXT_PUBLIC_* variables are allowed here
 * because they are embedded in browser JavaScript - never put secrets in them.
 * Each variable must be referenced literally so Next.js can inline it.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url({ error: "NEXT_PUBLIC_API_BASE_URL must be a URL, e.g. http://localhost:4000" }),
  /** Which website this build is (set in each app's next.config.ts). */
  NEXT_PUBLIC_PORTAL: z.enum(PORTALS, { error: 'NEXT_PUBLIC_PORTAL must be "user" or "admin"' }),
  NEXT_PUBLIC_APP_TIMEZONE: z
    .string()
    .default("UTC")
    .refine(isValidTimeZone, "NEXT_PUBLIC_APP_TIMEZONE must be an IANA timezone, e.g. Asia/Colombo"),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_PORTAL: process.env.NEXT_PUBLIC_PORTAL,
  NEXT_PUBLIC_APP_TIMEZONE: process.env.NEXT_PUBLIC_APP_TIMEZONE || undefined,
});

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid frontend environment configuration:\n${problems}\nSee .env.example.`);
}

export const publicEnv = {
  apiBaseUrl: parsed.data.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, ""),
  timeZone: parsed.data.NEXT_PUBLIC_APP_TIMEZONE,
  portal: parsed.data.NEXT_PUBLIC_PORTAL,
} as const;
