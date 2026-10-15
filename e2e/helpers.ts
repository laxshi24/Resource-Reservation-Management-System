import { expect, type Page } from "@playwright/test";

export const API_URL = "http://localhost:4100";

/** The admin comes from ADMIN_EMAIL/ADMIN_PASSWORD (playwright.config.ts); the user from the seed script. */
export const DEMO = {
  admin: { email: "admin@example.com", password: "Admin@12345", name: "Administrator" },
  user: { email: "user@example.com", password: "User@12345", name: "Demo User" },
} as const;

let counter = 0;
/** A name that is unique per test run, so specs never collide with each other or seed data. */
export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}${++counter}`;
}

/**
 * Logs in through the API. `page.request` shares the browser context's
 * cookies, so the session cookie set by the API is used by the website too.
 */
export async function loginViaApi(
  page: Page,
  portal: "admin" | "user",
  account: { email: string; password: string } = DEMO[portal],
) {
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    headers: { "x-portal": portal },
    data: { email: account.email, password: account.password },
  });
  expect(response.status(), `login as ${account.email} on ${portal} website`).toBe(200);
}

/** Calls the API as the logged-in admin (requires a prior loginViaApi(page, "admin")). */
export function adminRequest(page: Page) {
  const headers = { "x-portal": "admin" };
  return {
    get: (path: string) => page.request.get(`${API_URL}${path}`, { headers }),
    post: (path: string, data: unknown) => page.request.post(`${API_URL}${path}`, { headers, data }),
  };
}

/** Chooses an option in a shadcn/Radix <Select> identified by its label. */
export async function selectOption(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: option }).click();
}

/** Creates a resource through the API as the admin (logs in on the admin portal if needed). */
export async function createResourceViaApi(
  page: Page,
  input: { name: string; categorySlug?: string; isActive?: boolean; capacity?: number | null },
) {
  await loginViaApi(page, "admin");
  const api = adminRequest(page);
  const categories = await (await api.get("/api/resource-categories")).json();
  const category = categories.data.find((c: { slug: string }) => c.slug === (input.categorySlug ?? "meeting-rooms"));
  const response = await api.post("/api/resources", {
    name: input.name,
    categoryId: category.id,
    isActive: input.isActive ?? true,
    capacity: input.capacity === undefined ? 6 : input.capacity,
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data as { id: string; name: string };
}

/** Formats a Date as the value of an <input type="datetime-local"> in UTC (the e2e app timezone). */
export function toLocalInput(date: Date) {
  return date.toISOString().slice(0, 16);
}

/** A whole hour `days` days from now, in UTC. */
export function futureHour(days: number, hour: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}
