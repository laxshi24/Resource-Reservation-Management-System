import { expect, test } from "@playwright/test";
import { DEMO } from "../helpers";

test.describe("Admin website authentication", () => {
  test("redirects to login, logs in, and logs out", async ({ page }) => {
    await page.goto("/resources");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(DEMO.admin.email);
    await page.getByLabel("Password").fill(DEMO.admin.password);
    await page.getByRole("button", { name: "Log in to admin console" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("button", { name: `Account menu for ${DEMO.admin.name}` }).first().click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("rejects regular users and wrong passwords", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO.user.email);
    await page.getByLabel("Password").fill(DEMO.user.password);
    await page.getByRole("button", { name: "Log in to admin console" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();

    await page.getByLabel("Email").fill(DEMO.admin.email);
    await page.getByLabel("Password").fill("WrongPassword1");
    await page.getByRole("button", { name: "Log in to admin console" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("has no signup - only the configured administrator can log in", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /sign up|create/i })).toHaveCount(0);
    await page.goto("/signup");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
