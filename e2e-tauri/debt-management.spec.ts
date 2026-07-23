import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Debt Management", () => {
  test("create new debt via modal", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Utang" }).click();

    // Open add debt modal
    await page.getByRole("button", { name: /Tambah Utang/ }).click();
    await expect(page.getByRole("heading", { name: /Utang Baru|Catat Utang/ })).toBeVisible({ timeout: 5000 });

    // Fill form
    const customerName = `Pelanggan ${Date.now()}`;
    await page.getByPlaceholder("Nama pelanggan").fill(customerName);
    await page.getByPlaceholder("628xxxx").fill("628123456789");

    // Submit
    await page.getByRole("button", { name: "Simpan Utang" }).click();

    // Verify debt appears in table
    await expect(page.getByText(customerName)).toBeVisible({ timeout: 5000 });
  });

  test("open payment modal from debt row", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Utang" }).click();

    // Click payment button on first debt row
    const payButton = page.locator("button[aria-label*='Catat pembayaran']").first();
    if (await payButton.isVisible()) {
      await payButton.click();
      await expect(page.getByRole("heading", { name: /Pembayaran Utang|Catat Pembayaran/ })).toBeVisible({ timeout: 5000 });
      await page.getByRole("button", { name: "Batal" }).click();
    }
  });

  test("filter debts by status", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Utang" }).click();

    // Verify filter chips
    await expect(page.getByRole("tab", { name: "Belum Lunas" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Lunas" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Semua" })).toBeVisible();

    // Switch filter
    await page.getByRole("tab", { name: "Semua" }).click();
  });
});
