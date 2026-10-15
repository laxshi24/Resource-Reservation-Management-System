import { expect, test } from "@playwright/test";
import { createResourceViaApi, loginViaApi, selectOption, uniqueName } from "../helpers";

test.describe("Resource management", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, "admin");
  });

  test("creates a resource that persists after a page reload", async ({ page }) => {
    const name = uniqueName("E2E Room");
    await page.goto("/resources/new");

    await page.getByLabel("Name").fill(name);
    await selectOption(page, "Category", "Meeting Rooms");
    await page.getByLabel("Location").fill("Level 9");
    await page.getByLabel("Capacity").fill("10");
    await page.getByRole("button", { name: "Create resource" }).click();

    await expect(page).toHaveURL(/\/resources\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Level 9")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    await page.goto(`/resources?search=${encodeURIComponent(name)}`);
    await expect(page.getByRole("link", { name }).first()).toBeVisible();
  });

  test("shows validation errors and rejects duplicate names", async ({ page }) => {
    const existing = await createResourceViaApi(page, { name: uniqueName("E2E Dup") });
    await page.goto("/resources/new");

    await page.getByRole("button", { name: "Create resource" }).click();
    await expect(page.getByText("Name must be at least 2 characters")).toBeVisible();
    await expect(page.getByText("Please choose a category")).toBeVisible();

    await page.getByLabel("Name").fill(existing.name.toUpperCase());
    await selectOption(page, "Category", "Projectors");
    await page.getByLabel("Capacity").fill("abc");
    await page.getByRole("button", { name: "Create resource" }).click();
    await expect(page.getByText(/whole number between 1 and 1000/)).toBeVisible();

    await page.getByLabel("Capacity").fill("");
    await page.getByRole("button", { name: "Create resource" }).click();
    await expect(page.getByText(/already exists/)).toBeVisible();
    await expect(page).toHaveURL(/\/resources\/new$/);
  });

  test("edits and deactivates a resource", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Edit") });

    await page.goto(`/resources/${resource.id}/edit`);
    await page.getByLabel("Location").fill("Annex, Level 2");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/resources/${resource.id}$`));
    await expect(page.getByText("Annex, Level 2")).toBeVisible();

    await page.getByRole("button", { name: "Deactivate" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Deactivate");
    await dialog.getByRole("button", { name: "Deactivate" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Inactive").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Activate" })).toBeVisible();

    await page.goto(`/resources?status=inactive&search=${encodeURIComponent(resource.name)}`);
    await expect(page.getByRole("link", { name: resource.name }).first()).toBeVisible();
  });

  test("filters resources by search text and category", async ({ page }) => {
    const vehicle = await createResourceViaApi(page, { name: uniqueName("E2E Shuttle"), categorySlug: "vehicles" });
    await page.goto("/resources");

    await page.getByLabel("Search").fill(vehicle.name);
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByRole("link", { name: vehicle.name }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Board Room" })).toHaveCount(0);

    await selectOption(page, "Category", "Meeting Rooms");
    await expect(page.getByText("No resources match your filters")).toBeVisible();
  });
});
