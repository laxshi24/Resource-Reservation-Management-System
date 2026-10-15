import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Public config the modules under test expect (normally provided by .env).
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
      NEXT_PUBLIC_APP_TIMEZONE: "Asia/Colombo",
      NEXT_PUBLIC_PORTAL: "user",
    },
  },
});
