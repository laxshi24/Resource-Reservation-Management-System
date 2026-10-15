import { expect, test } from "@playwright/test";
import { API_URL, createResourceViaApi, futureHour, loginViaApi, selectOption, toLocalInput, uniqueName } from "../helpers";

test.describe("Reservation booking", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, "admin");
  });

  test("books a resource from its detail page and shows a confirmation", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Book") });

    await page.goto(`/resources/${resource.id}`);
    await page.getByRole("link", { name: "Book" }).click();
    await expect(page).toHaveURL(/\/reservations\/new\?resourceId=/);
    await expect(page.getByLabel("Resource")).toContainText(resource.name);

    await page.getByLabel("Start").fill(toLocalInput(futureHour(3, 10)));
    await page.getByLabel("End").fill(toLocalInput(futureHour(3, 11)));
    await page.getByLabel("Booked for").fill("Ada Lovelace");
    await page.getByLabel(/Purpose/).fill("Design review");
    await expect(page.getByText("Duration: 1 h")).toBeVisible();
    await page.getByRole("button", { name: "Confirm reservation" }).click();

    await expect(page).toHaveURL(/\/reservations\/[0-9a-f-]{36}\?created=1$/);
    await expect(page.getByText("Reservation confirmed").first()).toBeVisible();
    await expect(page.getByText("Ada Lovelace").first()).toBeVisible();
    await expect(page.getByText("Design review")).toBeVisible();

    // The booking shows up on the resource page after a fresh load.
    await page.goto(`/resources/${resource.id}`);
    await expect(page.getByText(/Upcoming reservations/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Design review/ })).toBeVisible();
  });

  test("rejects an overlapping booking with a clear message, but allows back-to-back", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Clash") });
    const existing = await page.request.post(`${API_URL}/api/reservations`, {
      headers: { "x-portal": "admin" },
      data: {
        resourceId: resource.id,
        bookedBy: "First Person",
        startTime: futureHour(4, 9).toISOString(),
        endTime: futureHour(4, 11).toISOString(),
      },
    });
    expect(existing.status()).toBe(201);

    await page.goto(`/reservations/new?resourceId=${resource.id}`);
    await page.getByLabel("Start").fill(toLocalInput(futureHour(4, 10)));
    await page.getByLabel("End").fill(toLocalInput(futureHour(4, 12)));
    await page.getByLabel("Booked for").fill("Second Person");
    await page.getByRole("button", { name: "Confirm reservation" }).click();

    await expect(page.getByText("Time slot unavailable")).toBeVisible();
    await expect(page.getByText(/already reserved during the selected time/)).toBeVisible();
    await expect(page.getByRole("link", { name: /See what is available/ })).toBeVisible();
    await expect(page).toHaveURL(/\/reservations\/new/);

    // 11:00 is the exclusive end of the existing booking, so 11:00-12:00 is free.
    await page.getByLabel("Start").fill(toLocalInput(futureHour(4, 11)));
    await page.getByRole("button", { name: "Confirm reservation" }).click();
    await expect(page).toHaveURL(/\?created=1$/);
  });

  test("validates the form and does not offer inactive resources", async ({ page }) => {
    const inactive = await createResourceViaApi(page, { name: uniqueName("E2E Inactive"), isActive: false });
    const active = await createResourceViaApi(page, { name: uniqueName("E2E Active") });

    await page.goto("/reservations/new");
    await page.getByLabel("Resource").click();
    await expect(page.getByRole("option", { name: active.name })).toBeVisible();
    await expect(page.getByRole("option", { name: inactive.name })).toHaveCount(0);
    await page.getByRole("option", { name: active.name }).click();

    await page.getByLabel("Start").fill(toLocalInput(futureHour(5, 15)));
    await page.getByLabel("End").fill(toLocalInput(futureHour(5, 14)));
    await page.getByLabel("Booked for").fill("A");
    await page.getByRole("button", { name: "Confirm reservation" }).click();

    await expect(page.getByText("End time must be later than start time")).toBeVisible();
    await expect(page.getByText(/Your name must be at least 2 characters/)).toBeVisible();
  });

  test("selecting a resource from the dropdown works without a preselection", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Pick"), categorySlug: "projectors", capacity: null });
    await page.goto("/reservations/new");
    await selectOption(page, "Resource", resource.name);
    await page.getByLabel("Start").fill(toLocalInput(futureHour(6, 9)));
    await page.getByLabel("End").fill(toLocalInput(futureHour(6, 10)));
    await page.getByLabel("Booked for").fill("Grace Hopper");
    await page.getByRole("button", { name: "Confirm reservation" }).click();
    await expect(page).toHaveURL(/\?created=1$/);
  });
});
