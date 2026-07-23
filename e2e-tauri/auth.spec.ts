import { expect, test } from "@playwright/test";

test.describe("CatatAgen Tauri auth", () => {
  test("shows login page and logs in to dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Masuk ke Aplikasi" })).toBeVisible();
    await expect(page.getByText("Selamat datang kembali")).toBeVisible();

    await page.getByPlaceholder("Masukkan username").fill("admin");
    await page.getByPlaceholder("Masukkan password").fill("Admin123");
    await page.getByRole("button", { name: /masuk/i }).click();

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    // Verify 6 menu navigation
    await expect(page.getByRole("button", { name: "Kasir POS", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Layanan Agen", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Transaksi", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keuangan", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pengaturan", exact: true })).toBeVisible();
  });
});
