import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("POS Checkout — Cash Payment", () => {
  test("complete cash checkout flow with receipt", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Kasir POS" }).click();
    await expect(page.getByRole("heading", { name: "Kasir POS" })).toBeVisible();

    // Click first available product to add to cart
    const productButton = page.locator("button").filter({ hasText: /Rp/ }).first();
    await productButton.click();

    // Verify cart has item
    await expect(page.getByText("1 item").first()).toBeVisible({ timeout: 5000 });

    // Click Bayar
    await page.getByRole("button", { name: /Bayar Sekarang/ }).click();
    await expect(page.getByRole("heading", { name: "Konfirmasi Pembayaran" })).toBeVisible();

    // Verify payment modal shows total
    await expect(page.getByText("Total Belanja")).toBeVisible();

    // Verify cash method is selected by default
    await expect(page.getByText("Kembalian")).toBeVisible();

    // Submit transaction
    await page.getByRole("button", { name: /Simpan Transaksi/ }).click();

    // Verify receipt appears
    await expect(page.getByRole("heading", { name: "Struk Penjualan" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Terima kasih")).toBeVisible();
  });
});

test.describe("POS Checkout — Transfer Payment", () => {
  test("complete transfer checkout flow", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Kasir POS" }).click();

    // Add product to cart
    const productButton = page.locator("button").filter({ hasText: /Rp/ }).first();
    await productButton.click();
    await expect(page.getByText("1 item").first()).toBeVisible({ timeout: 5000 });

    // Open payment modal
    await page.getByRole("button", { name: /Bayar Sekarang/ }).click();

    // Switch to Transfer
    await page.getByRole("button", { name: "Transfer" }).click();

    // Select settlement account
    await page.locator("select#settlement-account").selectOption({ index: 1 });

    // Submit
    await page.getByRole("button", { name: /Simpan Transaksi/ }).click();

    // Verify receipt
    await expect(page.getByRole("heading", { name: "Struk Penjualan" })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("POS — Cart Operations", () => {
  test("add, update quantity, and clear cart", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Kasir POS" }).click();

    // Add product
    const productButton = page.locator("button").filter({ hasText: /Rp/ }).first();
    await productButton.click();
    await expect(page.getByText("1 item").first()).toBeVisible({ timeout: 5000 });

    // Increase quantity
    await page.getByLabel(/Tambah/).first().click();
    await expect(page.getByText("2 item").first()).toBeVisible({ timeout: 3000 });

    // Decrease quantity
    await page.getByLabel(/Kurangi/).first().click();
    await expect(page.getByText("1 item").first()).toBeVisible({ timeout: 3000 });

    // Clear cart
    await page.getByRole("button", { name: /Kosongkan/ }).click();
    await expect(page.getByText("Keranjang masih kosong")).toBeVisible();
  });
});
