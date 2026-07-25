import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Backup & Restore", () => {
  test("create backup and verify in list", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Backup & Export" }).click();

    // Click create backup
    await page.getByRole("button", { name: "Cadangkan Data" }).click();

    // Verify backup appears in list
    await expect(page.getByText(/catatagen-backup/)).toBeVisible({ timeout: 10000 });
  });

  test("verify CSV export buttons exist", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Backup & Export" }).click();

    // Verify all 4 export buttons
    await expect(page.getByRole("button", { name: /Transaksi/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Mutasi Saldo/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Utang/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Produk/ })).toBeVisible();
  });
});
