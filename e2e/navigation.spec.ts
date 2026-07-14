import { test, expect } from "@playwright/test";

// ── E2E: Navigation Flow ─────────────────────────
// Test: sidebar navigation, all pages accessible
//
// F-06: Auth state is loaded via storageState in playwright.config.ts.
// No need to login in beforeEach — globalSetup handles it once.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
});

test.describe("Navigation Flow", () => {
  test("should navigate to Dashboard", async ({ page }) => {
    await expect(page.locator("text=/dashboard|kasir|layanan/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to POS (Kasir POS)", async ({ page }) => {
    await page.click('button:has-text("Kasir POS"), a:has-text("Kasir POS")');
    await expect(page.locator("text=/cari produk|scan barcode/i")).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Layanan Agen", async ({ page }) => {
    await page.click('button:has-text("Layanan"), button:has-text("BRILink"), button:has-text("Agen")');
    await expect(page.locator("text=/layanan|pilih layanan/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Produk", async ({ page }) => {
    await page.click('button:has-text("Produk")');
    await expect(page.locator("text=/manajemen|produk|kategori/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Transaksi (History)", async ({ page }) => {
    await page.click('button:has-text("Transaksi")');
    await expect(page.locator("text=/transaksi|riwayat|invoice/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Rekening Koran", async ({ page }) => {
    await page.click('button:has-text("Rekening Koran")');
    await expect(page.locator("text=/rekening koran|mutasi/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Kas & Saldo", async ({ page }) => {
    await page.click('button:has-text("Kas"), button:has-text("Saldo")');
    await expect(page.locator("text=/saldo|rekening|kas/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Pengaturan", async ({ page }) => {
    await page.click('button:has-text("Pengaturan")');
    await expect(page.locator("text=/pengaturan|branding|toko/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show user info in sidebar", async ({ page }) => {
    await expect(page.locator("text=/admin|administrator/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show clock in sidebar", async ({ page }) => {
    await expect(page.locator("text=/\\d{2}:\\d{2}/").first()).toBeVisible({ timeout: 5000 });
  });
});
