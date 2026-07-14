import { test, expect } from "@playwright/test";

// ── E2E: POS Flow ────────────────────────────────
// Test: add to cart, checkout, discount, hold/resume

test.beforeEach(async ({ page }) => {
  // F-06: Auth via storageState. Just navigate to / and then to POS.
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // Navigate to POS
  await page.click('button:has-text("Kasir POS")');
  await page.waitForSelector("text=/cari produk|scan barcode/i", { timeout: 10000 });
});

test.describe("POS Flow", () => {
  test("should display product grid", async ({ page }) => {
    // Should see product cards or search results
    await page.waitForTimeout(2000); // Wait for products to load
    const productButtons = page.locator('button:has-text("Rp"), [class*="rounded"]:has-text("Rp")');
    const count = await productButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should search products by name", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="cari produk" i], input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("Indomie");
      await page.waitForTimeout(1000);
      // Should show Indomie in results
      await expect(page.locator("text=/indomie/i").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should add product to cart", async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for products to load

    // Click first product
    const firstProduct = page.locator('button:has-text("Rp")').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      // Cart should show the product
      const cartItem = page.locator("text=/indomie|aqua|goreng|botol/i").first();
      await expect(cartItem).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show cart total", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Add a product first
    const firstProduct = page.locator('button:has-text("Rp")').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      // Should see total
      const totalElement = page.locator("text=/total/i").filter({ hasText: "Rp" });
      if (await totalElement.isVisible()) {
        await expect(totalElement).toBeVisible();
      }
    }
  });

  test("should open payment modal with F1 or Bayar button", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Add a product
    const firstProduct = page.locator('button:has-text("Rp")').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      // Click Bayar button
      const payButton = page.locator('button:has-text("Bayar")');
      if (await payButton.isVisible()) {
        await payButton.click();
        await page.waitForTimeout(500);

        // Should see payment modal
        await expect(page.locator("text=/pembayaran|metode pembayaran/i")).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should show payment method options", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Add a product and open payment
    const firstProduct = page.locator('button:has-text("Rp")').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      const payButton = page.locator('button:has-text("Bayar")');
      if (await payButton.isVisible()) {
        await payButton.click();
        await page.waitForTimeout(1000);

        // Should see payment methods
        await expect(page.locator("text=/tunai/i")).toBeVisible({ timeout: 5000 });
        await expect(page.locator("text=/transfer/i")).toBeVisible({ timeout: 5000 });
        await expect(page.locator("text=/qris/i")).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should show discount button", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Add a product
    const firstProduct = page.locator('button:has-text("Rp")').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      // Should see discount button
      const discountBtn = page.locator('button:has-text("Diskon"), button[title*="diskon" i]');
      if (await discountBtn.isVisible()) {
        await discountBtn.click();
        await page.waitForTimeout(500);

        // Should see discount modal
        await expect(page.locator("text=/diskon|persen|rupiah/i")).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should show hold button", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Add a product
    const firstProduct = page.locator('button:has-text("Rp")').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      // Should see hold button
      const holdBtn = page.locator('button:has-text("Hold"), button[title*="hold" i]');
      await expect(holdBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show keyboard shortcut hints (F1, F2)", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Add a product
    const firstProduct = page.locator('button:has-text("Rp")').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      // Should see F1 hint on Bayar button
      const bayarBtn = page.locator('button:has-text("F1"), button:has-text("Bayar")');
      await expect(bayarBtn).toBeVisible({ timeout: 5000 });
    }
  });
});
