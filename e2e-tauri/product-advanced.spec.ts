import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Product Management via Settings", () => {
  test("view product list in Settings > Produk", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Produk" }).click();

    // Verify product summary section
    await expect(page.getByText("Ringkasan Produk")).toBeVisible();
    await expect(page.getByRole("button", { name: "Unduh CSV" })).toBeVisible();
  });
});
