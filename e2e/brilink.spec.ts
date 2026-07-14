import { test, expect } from "@playwright/test";

// ── E2E: BRILink (Layanan Agen) Flow ─────────────
// Test: service categories, service selection, transaction form

test.beforeEach(async ({ page }) => {
  // F-06: Auth via storageState. Just navigate to / and then to services.
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // Navigate to services page
  await page.click('button:has-text("Layanan"), button:has-text("BRILink"), button:has-text("Agen")');
  await page.waitForTimeout(2000);
});

test.describe("BRILink Flow", () => {
  test("should display service categories", async ({ page }) => {
    // Should see category filters
    const categories = page.locator("text=/transfer|tarik tunai|setor|pembayaran|token pln|pulsa|voucher|cicilan/i");
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should display service cards", async ({ page }) => {
    await page.waitForTimeout(2000);
    // Should see service buttons/cards
    const services = page.locator('button:has-text("Transfer"), button:has-text("Tarik"), button:has-text("Tagihan"), button:has-text("Token"), button:has-text("Pulsa")');
    const count = await services.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should filter services by category", async ({ page }) => {
    // Click Transfer category filter
    const transferFilter = page.locator('button:has-text("Transfer")').first();
    if (await transferFilter.isVisible()) {
      await transferFilter.click();
      await page.waitForTimeout(1000);

      // Should see transfer-related services
      await expect(page.locator("text=/transfer antar|transfer sesama|transfer ke/i").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should open transaction form when service clicked", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click first service
    const firstService = page.locator('button:has-text("Transfer"), button:has-text("Tarik"), button:has-text("Tagihan")').first();
    if (await firstService.isVisible()) {
      await firstService.click();
      await page.waitForTimeout(1000);

      // Should see transaction form
      await expect(page.locator("text=/nama pelanggan|nominal|transaksi/i")).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show BPJS periode field for BPJS service", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for BPJS service
    const bpjsService = page.locator('button:has-text("BPJS")').first();
    if (await bpjsService.isVisible()) {
      await bpjsService.click();
      await page.waitForTimeout(1000);

      // Should see periode (bulan) field
      await expect(page.locator('input[type="month"], text=/periode/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show Token PLN services", async ({ page }) => {
    // Look for Token PLN category
    const tokenFilter = page.locator('button:has-text("Token PLN")').first();
    if (await tokenFilter.isVisible()) {
      await tokenFilter.click();
      await page.waitForTimeout(1000);

      // Should see Token PLN services
      await expect(page.locator("text=/token pln/i").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show Voucher Game services", async ({ page }) => {
    const voucherFilter = page.locator('button:has-text("Voucher")').first();
    if (await voucherFilter.isVisible()) {
      await voucherFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator("text=/voucher game/i").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show Cicilan services", async ({ page }) => {
    const cicilanFilter = page.locator('button:has-text("Cicilan")').first();
    if (await cicilanFilter.isVisible()) {
      await cicilanFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator("text=/fif|adira|wom/i").first()).toBeVisible({ timeout: 5000 });
    }
  });
});
