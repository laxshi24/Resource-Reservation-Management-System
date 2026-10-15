import { expect, test } from "@playwright/test";
import { createResourceViaApi, futureHour, loginViaApi, toLocalInput, uniqueName } from "../helpers";

// Runs in the "user-mobile" project (Pixel 7 viewport), see playwright.config.ts.
test.describe("User website on a phone", () => {
  test("navigates with the menu and books a resource", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Mobile") });
    await loginViaApi(page, "user");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Hi Demo/ })).toBeVisible();
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Resources" }).click();
    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();

    await page.goto(`/reservations/new?resourceId=${resource.id}`);
    await page.getByLabel("Start").fill(toLocalInput(futureHour(11, 9)));
    await page.getByLabel("End").fill(toLocalInput(futureHour(11, 10)));
    await page.getByRole("button", { name: "Confirm reservation" }).click();
    await expect(page).toHaveURL(/\?created=1$/);

    // No horizontal scrolling on the main pages.
    for (const path of ["/", "/resources", "/reservations", "/availability", "/login"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
