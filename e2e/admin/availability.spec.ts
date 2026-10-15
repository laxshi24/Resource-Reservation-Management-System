import { expect, test } from "@playwright/test";
import { API_URL, createResourceViaApi, futureHour, loginViaApi, selectOption, toLocalInput, uniqueName } from "../helpers";

test.describe("Availability search", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, "admin");
  });

  test("shows occupied vs available from live data and starts a booking from a free resource", async ({ page }) => {
    const busy = await createResourceViaApi(page, { name: uniqueName("E2E Busy"), categorySlug: "workstations" });
    const free = await createResourceViaApi(page, { name: uniqueName("E2E Free"), categorySlug: "workstations" });
    const booking = await page.request.post(`${API_URL}/api/reservations`, {
      headers: { "x-portal": "admin" },
      data: {
        resourceId: busy.id,
        bookedBy: "Occupying Person",
        startTime: futureHour(10, 9).toISOString(),
        endTime: futureHour(10, 12).toISOString(),
      },
    });
    expect(booking.status()).toBe(201);

    await page.goto("/availability");
    await page.getByLabel("From", { exact: true }).fill(toLocalInput(futureHour(10, 10)));
    await page.getByLabel("To", { exact: true }).fill(toLocalInput(futureHour(10, 11)));
    await selectOption(page, "Category", "Workstations");
    await page.getByRole("button", { name: "Check availability" }).click();
    await expect(page).toHaveURL(/categoryId=/);

    const busyCard = page.locator("[data-state]").filter({ hasText: busy.name });
    const freeCard = page.locator("[data-state]").filter({ hasText: free.name });
    await expect(busyCard).toHaveAttribute("data-state", "OCCUPIED");
    await expect(busyCard).toContainText("Occupying Person");
    await expect(freeCard).toHaveAttribute("data-state", "AVAILABLE");

    // "Occupied" filter only lists the busy resource.
    await page.getByRole("link", { name: /^Occupied/ }).click();
    await expect(page.locator("[data-state]").filter({ hasText: free.name })).toHaveCount(0);
    await page.getByRole("link", { name: /^All/ }).click();

    // Book the free one straight from the results, with the time pre-filled.
    await page.getByRole("link", { name: `Book ${free.name} for this time` }).click();
    await expect(page).toHaveURL(/\/reservations\/new\?/);
    await expect(page.getByLabel("Start")).toHaveValue(toLocalInput(futureHour(10, 10)));
    await page.getByLabel("Booked for").fill("Availability Booker");
    await page.getByRole("button", { name: "Confirm reservation" }).click();
    await expect(page).toHaveURL(/\?created=1$/);

    // Immediately reflected: the free resource is now occupied for that window.
    const query = new URLSearchParams({ start: toLocalInput(futureHour(10, 10)), end: toLocalInput(futureHour(10, 11)) });
    await page.goto(`/availability?${query}`);
    await expect(page.locator("[data-state]").filter({ hasText: free.name })).toHaveAttribute("data-state", "OCCUPIED");
  });
});
