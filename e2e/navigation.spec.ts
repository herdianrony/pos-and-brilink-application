import { test, expect } from "@playwright/test";

// ── E2E: Navigation Flow ─────────────────────────
// Test: sidebar navigation, all pages accessible

// Helper: login before each test
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });
  await page.fill('input[placeholder*="username" i]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });
});

test.describe("Navigation Flow", () => {
  test("should navigate to Dashboard", async ({ page }) => {
    // Already on dashboard after login
    await expect(page.locator("text=/dashboard/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to POS (Kasir POS)", async ({ page }) => {
    await page.click('button:has-text("Kasir POS"), a:has-text("Kasir POS")');
    // Should see POS interface
    await expect(page.locator("text=/cari produk|scan barcode/i")).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Layanan Agen", async ({ page }) => {
    // Click the services menu (label is dynamic from settings)
    await page.click('button:has-text("Layanan"), button:has-text("BRILink"), button:has-text("Agen")');
    // Should see services page
    await expect(page.locator("text=/layanan|pilih layanan/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Produk", async ({ page }) => {
    await page.click('button:has-text("Produk")');
    // Should see products management
    await expect(page.locator("text=/manajemen|produk|kategori/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Transaksi (History)", async ({ page }) => {
    await page.click('button:has-text("Transaksi")');
    // Should see history page
    await expect(page.locator("text=/transaksi|riwayat|invoice/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Rekening Koran", async ({ page }) => {
    await page.click('button:has-text("Rekening Koran")');
    // Should see rekening koran page
    await expect(page.locator("text=/rekening koran|mutasi/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Kas & Saldo", async ({ page }) => {
    await page.click('button:has-text("Kas"), button:has-text("Saldo")');
    // Should see cash management
    await expect(page.locator("text=/saldo|rekening|kas/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Pengaturan", async ({ page }) => {
    await page.click('button:has-text("Pengaturan")');
    // Should see settings page
    await expect(page.locator("text=/pengaturan|branding|toko/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show user info in sidebar", async ({ page }) => {
    // Should see user name or role
    await expect(page.locator("text=/admin|administrator/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show clock in sidebar", async ({ page }) => {
    // Sidebar should show time (HH:MM format)
    await expect(page.locator("text=/\\d{2}:\\d{2}/").first()).toBeVisible({ timeout: 5000 });
  });
});
