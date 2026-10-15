import { expect, test } from "@playwright/test";
import { DEMO, uniqueName } from "../helpers";

test.describe("User website authentication", () => {
  test("signs up, lands on the dashboard, logs out and logs back in", async ({ page }) => {
    const email = `${uniqueName("person").replace(/\s+/g, ".").toLowerCase()}@example.com`;

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("link", { name: "Create an account" }).click();

    // Client-side validation first.
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Name must be at least 2 characters")).toBeVisible();

    await page.getByLabel("Full name").fill("Priya Example");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("Secret123");
    await page.getByLabel("Confirm password").fill("Different1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await expect(page.getByLabel("Admin invite code")).toHaveCount(0); // never asked on the user site

    await page.getByLabel("Confirm password").fill("Secret123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: /Hi Priya/ })).toBeVisible();

    await page.getByRole("button", { name: "Account menu for Priya Example" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Secret123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("heading", { name: /Hi Priya/ })).toBeVisible();
  });

  test("rejects a duplicate email and wrong passwords", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Copy Cat");
    await page.getByLabel("Email").fill(DEMO.user.email);
    await page.getByLabel("Password", { exact: true }).fill("Secret123");
    await page.getByLabel("Confirm password").fill("Secret123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/already exists/)).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO.user.email);
    await page.getByLabel("Password").fill("WrongPassword1");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });
});
