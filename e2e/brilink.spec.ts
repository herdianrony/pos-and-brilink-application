import { test, expect } from "@playwright/test";

// ── E2E: BRILink (Layanan Agen) Flow ─────────────
// Test: service categories, service selection, transaction form

test.beforeEach(async ({ page }) => {
  // F-06: Auth via storageState. Navigate directly by hash to avoid
  // brittle sidebar text matching after branding/menu changes.
  await page.goto("/#brilink");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
});

test.describe("BRILink Flow", () => {
  test("should display service categories", async ({ page }) => {
    // Should see category filters
    const categories = page.locator(
      "text=/transfer|tarik tunai|setor|pembayaran|token pln|pulsa|voucher|cicilan/i",
    );
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should display service cards", async ({ page }) => {
    await page.waitForTimeout(2000);
    // Should see service buttons/cards
    const services = page.locator(
      'button:has-text("Transfer"), button:has-text("Tarik"), button:has-text("Tagihan"), button:has-text("Token"), button:has-text("Pulsa")',
    );
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
      await expect(
        page
          .locator("text=/kirim transfer|transfer|tarik tunai|setor tunai/i")
          .first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should open transaction form when service clicked", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Click real service card, not the category filter button.
    const firstService = page
      .getByTestId("service-card-transfer_cash")
      .or(page.getByTestId("service-card-cash_withdrawal"))
      .first();
    await expect(firstService).toBeVisible({ timeout: 5000 });
    await firstService.click();
    await page.waitForTimeout(1000);

    // Modal should open with service name as heading
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(
      dialog
        .locator(
          'h3:has-text("Transfer"), h3:has-text("Tarik"), h3:has-text("Tagihan")',
        )
        .first(),
    ).toBeVisible({ timeout: 5000 });
    // Form label/text should be visible. Use text matching instead of label-only
    // selector because the shared Input component may wrap label markup.
    await expect(dialog.getByText(/Nama Pelanggan/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show BPJS periode field for BPJS service", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for BPJS service
    const bpjsService = page.locator('button:has-text("BPJS")').first();
    await expect(bpjsService).toBeVisible({ timeout: 5000 });
    await bpjsService.click();
    await page.waitForTimeout(1000);

    // Should see Periode (Bulan) label — not a CSS selector mix
    await expect(page.locator("label:has-text('Periode')")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show Token PLN services", async ({ page }) => {
    // Look for Token PLN category
    const tokenFilter = page.locator('button:has-text("Token PLN")').first();
    if (await tokenFilter.isVisible()) {
      await tokenFilter.click();
      await page.waitForTimeout(1000);

      // Should see Token PLN services
      await expect(page.locator("text=/token pln/i").first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should show Voucher Game services", async ({ page }) => {
    const voucherFilter = page.locator('button:has-text("Voucher")').first();
    if (await voucherFilter.isVisible()) {
      await voucherFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator("text=/voucher game/i").first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should show Cicilan services", async ({ page }) => {
    const cicilanFilter = page.locator('button:has-text("Cicilan")').first();
    if (await cicilanFilter.isVisible()) {
      await cicilanFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator("text=/fif|adira|wom/i").first()).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
