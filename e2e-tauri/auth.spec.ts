import { expect, test } from "@playwright/test";

test.describe("CatatAgen Tauri auth", () => {
  test("shows Electron-like login page and logs in", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Masuk ke Aplikasi" })).toBeVisible();
    await expect(page.getByText("Selamat datang kembali")).toBeVisible();

    await page.getByPlaceholder("Masukkan username").fill("admin");
    await page.getByPlaceholder("Masukkan password").fill("Admin123");
    await page.getByRole("button", { name: /masuk/i }).click();

    await expect(page.getByRole("heading", { name: "Dashboard Operasional" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kasir POS", exact: true })).toBeVisible();
  });
});
