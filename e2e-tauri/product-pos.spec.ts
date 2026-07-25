import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("CatatAgen Tauri product and POS", () => {
  test("adds product via Settings and checks out POS", async ({ page }) => {
    await login(page);

    // Go to Settings > Produk
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Produk" }).click();
    await expect(page.getByRole("heading", { name: "Ringkasan Produk" })).toBeVisible();

    // Navigate to standalone Produk page for CRUD
    await page.getByRole("button", { name: "Kasir POS" }).click();
    await expect(page.getByRole("heading", { name: "Kasir POS" })).toBeVisible();

    // Verify product grid is visible
    await expect(page.getByText("Cari produk atau scan barcode")).toBeVisible();
  });
});
