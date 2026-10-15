import { expect, test, type Page } from "@playwright/test";
import { API_URL, createResourceViaApi, futureHour, loginViaApi, uniqueName } from "../helpers";

async function bookViaApi(page: Page, resourceId: string, days: number, startHour: number, endHour: number, bookedBy = "Booker") {
  const response = await page.request.post(`${API_URL}/api/reservations`, {
    headers: { "x-portal": "admin" },
    data: {
      resourceId,
      bookedBy,
      purpose: "E2E cancellation test",
      startTime: futureHour(days, startHour).toISOString(),
      endTime: futureHour(days, endHour).toISOString(),
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data as { id: string };
}

test.describe("Reservation cancellation and management", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, "admin");
  });

  test("cancels a reservation, keeps it visible as cancelled, and frees the slot", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Cancel") });
    const reservation = await bookViaApi(page, resource.id, 7, 9, 10);

    await page.goto(`/reservations/${reservation.id}`);
    await page.getByRole("button", { name: "Cancel reservation" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByLabel(/Reason/).fill("Meeting moved online");
    await dialog.getByRole("button", { name: "Cancel reservation" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Meeting moved online")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel reservation" })).toHaveCount(0);

    // Persisted: still cancelled after reload.
    await page.reload();
    await expect(page.getByText("Meeting moved online")).toBeVisible();

    // Visible with the "Cancelled" filter, hidden with "Confirmed".
    const search = encodeURIComponent(resource.name);
    await page.goto(`/reservations?status=CANCELLED&search=${search}`);
    await expect(page.getByRole("link", { name: resource.name }).first()).toBeVisible();
    await page.goto(`/reservations?status=CONFIRMED&search=${search}`);
    await expect(page.getByText("No reservations match your filters")).toBeVisible();

    // Deliberate rebooking: "Book again" creates a NEW reservation for the freed slot.
    await page.goto(`/reservations/${reservation.id}`);
    await page.getByRole("link", { name: "Book again" }).click();
    await expect(page).toHaveURL(/\/reservations\/new\?/);
    await page.getByLabel("Booked for").fill("Second Booker");
    await page.getByRole("button", { name: "Confirm reservation" }).click();
    await expect(page).toHaveURL(/\?created=1$/);
    await expect(page.getByText("Second Booker").first()).toBeVisible();
  });

  test("cancels from the reservation list and edits booking details", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E List") });
    const toCancel = await bookViaApi(page, resource.id, 8, 9, 10, "List Booker");
    const toEdit = await bookViaApi(page, resource.id, 8, 11, 12, "Original Name");

    await page.goto(`/reservations?search=${encodeURIComponent("List Booker")}`);
    await page.getByRole("button", { name: `Actions for reservation of ${resource.name}` }).first().click();
    await page.getByRole("menuitem", { name: "Cancel reservation" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel reservation" }).click();
    await expect(page.getByText("Reservation cancelled").first()).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();

    const cancelled = await (await page.request.get(`${API_URL}/api/reservations/${toCancel.id}`, { headers: { "x-portal": "admin" } })).json();
    expect(cancelled.data.status).toBe("CANCELLED");

    await page.goto(`/reservations/${toEdit.id}`);
    await page.getByRole("button", { name: "Edit details" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Booked for").fill("Updated Name");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Updated Name").first()).toBeVisible();
  });

  test("filters reservations by resource and timeframe", async ({ page }) => {
    const resource = await createResourceViaApi(page, { name: uniqueName("E2E Filter") });
    await bookViaApi(page, resource.id, 9, 9, 10, "Filter Booker");

    await page.goto(`/reservations?resourceId=${resource.id}`);
    await expect(page.getByText("Filter Booker").first()).toBeVisible();

    await page.goto(`/reservations?resourceId=${resource.id}&timeframe=past`);
    await expect(page.getByText("No reservations match your filters")).toBeVisible();
  });
});
