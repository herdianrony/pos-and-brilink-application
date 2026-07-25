import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Backup & Restore", () => {
  test("open Backup tab and verify backup button", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Backup & Export" }).click();

    // Verify backup section
    await expect(page.getByText("Cadangkan & Pulihkan Data")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cadangkan Data" })).toBeVisible();

    // Verify CSV export buttons
    await expect(page.getByText("Unduh Data CSV")).toBeVisible();
  });
});
