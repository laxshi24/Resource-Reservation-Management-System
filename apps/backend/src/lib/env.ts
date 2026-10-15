import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgresql:// connection string"),
  /** Comma-separated list of browser origins allowed to call the API (user site, admin site). */
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000,http://localhost:3001"),
  /**
   * The one administrator account. The admin website has no signup: only this
   * email/password can log in there. When unset, admin login is disabled.
   */
  ADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "ADMIN_EMAIL must be a valid email address" }))
    .optional(),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters").optional(),
  /** Optional cookie domain for production (e.g. ".example.com" when sites and API share a parent domain). */
  COOKIE_DOMAIN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validated server environment. Parsed lazily (on first use) so that tooling
 * that merely imports modules does not crash, but any real request fails fast
 * with a readable message. Values are never echoed, only variable names.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid backend environment configuration:\n${problems}\nSee .env.example.`);
  }
  cached = result.data;
  return cached;
}

export function getAllowedOrigins(): string[] {
  return getEnv()
    .FRONTEND_ORIGIN.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
