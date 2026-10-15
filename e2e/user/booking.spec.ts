import { expect, test } from "@playwright/test";
import { adminRequest, createResourceViaApi, futureHour, loginViaApi, toLocalInput, uniqueName } from "../helpers";

test.describe("User website booking", () => {
  test("browses resources, books one, sees it in My bookings and cancels it", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E User Room") });
    await loginViaApi(page, "user");

    await page.goto(`/resources?search=${encodeURIComponent(resource.name)}`);
    await page.getByRole("link", { name: `Book ${resource.name}` }).click();
    await expect(page).toHaveURL(/\/reservations\/new\?resourceId=/);
    await expect(page.getByText("Booking as Demo User")).toBeVisible();
    await expect(page.getByLabel("Booked for")).toHaveCount(0); // users cannot book for others

    await page.getByLabel("Start").fill(toLocalInput(futureHour(12, 9)));
    await page.getByLabel("End").fill(toLocalInput(futureHour(12, 10)));
    await page.getByLabel(/Purpose/).fill("User e2e booking");
    await page.getByRole("button", { name: "Confirm reservation" }).click();
    await expect(page).toHaveURL(/\?created=1$/);
    await expect(page.getByText("Reservation confirmed").first()).toBeVisible();

    await page.getByRole("link", { name: "My bookings" }).first().click();
    await page.getByLabel("Search").fill(resource.name);
    await expect(page.getByRole("link", { name: resource.name }).first()).toBeVisible();
    await page.getByRole("link", { name: resource.name }).first().click();

    await page.getByRole("button", { name: "Cancel reservation" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel reservation" }).click();
    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
  });

  test("conflicts are rejected and other people's bookings stay private", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Private") });
    const theirs = await adminRequest(page).post("/api/reservations", {
      resourceId: resource.id,
      bookedBy: "Secret Colleague",
      startTime: futureHour(13, 9).toISOString(),
      endTime: futureHour(13, 11).toISOString(),
    });
    expect(theirs.status()).toBe(201);
    const theirsId = (await theirs.json()).data.id as string;

    await loginViaApi(page, "user");

    // Availability shows the slot as occupied without revealing who booked it.
    const query = new URLSearchParams({ start: toLocalInput(futureHour(13, 10)), end: toLocalInput(futureHour(13, 11)) });
    await page.goto(`/availability?${query}`);
    const card = page.locator("[data-state]").filter({ hasText: resource.name });
    await expect(card).toHaveAttribute("data-state", "OCCUPIED");
    await expect(card).not.toContainText("Secret Colleague");

    // Booking the same time is refused with a clear message.
    await page.goto(`/reservations/new?resourceId=${resource.id}`);
    await page.getByLabel("Start").fill(toLocalInput(futureHour(13, 10)));
    await page.getByLabel("End").fill(toLocalInput(futureHour(13, 12)));
    await page.getByRole("button", { name: "Confirm reservation" }).click();
    await expect(page.getByText("Time slot unavailable")).toBeVisible();

    // Someone else's reservation page is not found.
    await page.goto(`/reservations/${theirsId}`);
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
