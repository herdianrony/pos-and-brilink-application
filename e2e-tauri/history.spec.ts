import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Transaction History", () => {
  test("view transaction history page", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Transaksi" }).click();
    await expect(page.getByRole("heading", { name: "Riwayat Transaksi" })).toBeVisible();

    // Verify filter tabs
    await expect(page.getByRole("tab", { name: "Semua" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "POS" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Layanan Agen" })).toBeVisible();
  });
});
