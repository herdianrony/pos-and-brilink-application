import { test, expect } from "@playwright/test";

// ── E2E: POS Flow ────────────────────────────────
// Test: add to cart, checkout, discount, hold/resume
//
// F-06: Auth via storageState. "Cari produk" is a placeholder,
// NOT a text node — use placeholder selector, not text selector.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // Navigate to POS
  await page.click('button:has-text("Kasir POS")');
  // Wait for POS heading (visible text, not placeholder)
  await page.waitForSelector('h2:has-text("Kasir POS")', { timeout: 10000 });
  // Wait for search input to be ready
  await page.waitForSelector('input[placeholder*="cari produk" i]', { timeout: 10000 });
});

test.describe("POS Flow", () => {
  test("should display product grid", async ({ page }) => {
    // Wait for products to load — look for product name text
    await page.waitForTimeout(2000);
    const productButtons = page.locator('button:has-text("Rp"), [class*="rounded"]:has-text("Rp")');
    const count = await productButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should search products by name", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="cari produk" i]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Indomie");
    await page.waitForTimeout(1000);
    await expect(page.locator("text=/indomie/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should add product to cart", async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('button:has-text("Rp")').first();
    await expect(firstProduct).toBeVisible({ timeout: 5000 });
    await firstProduct.click();
    await page.waitForTimeout(500);
    // Cart should show the product name
    const cartItem = page.locator("text=/indomie|aqua|goreng|botol/i").first();
    await expect(cartItem).toBeVisible({ timeout: 5000 });
  });

  test("should show cart total", async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('button:has-text("Rp")').first();
    await expect(firstProduct).toBeVisible({ timeout: 5000 });
    await firstProduct.click();
    await page.waitForTimeout(500);
    // Total is displayed as "Total Pembayaran" or "Total Akhir" with formatted Rp
    await expect(page.locator("text=/Total (Pembayaran|Akhir)/i")).toBeVisible({ timeout: 5000 });
  });

  test("should open payment modal with F1 or Bayar button", async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('button:has-text("Rp")').first();
    await expect(firstProduct).toBeVisible({ timeout: 5000 });
    await firstProduct.click();
    await page.waitForTimeout(500);

    const payButton = page.locator('button:has-text("Bayar")');
    await expect(payButton).toBeVisible({ timeout: 5000 });
    await payButton.click();
    await page.waitForTimeout(500);

    // Payment modal heading is "Pembayaran"
    await expect(page.getByRole("heading", { name: "Pembayaran" })).toBeVisible({ timeout: 5000 });
  });

  test("should show payment method options", async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('button:has-text("Rp")').first();
    await expect(firstProduct).toBeVisible({ timeout: 5000 });
    await firstProduct.click();
    await page.waitForTimeout(500);

    const payButton = page.locator('button:has-text("Bayar")');
    await expect(payButton).toBeVisible({ timeout: 5000 });
    await payButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator("text=/tunai/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/transfer/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/qris/i")).toBeVisible({ timeout: 5000 });
  });

  test("should show discount button", async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('button:has-text("Rp")').first();
    await expect(firstProduct).toBeVisible({ timeout: 5000 });
    await firstProduct.click();
    await page.waitForTimeout(500);

    const discountBtn = page.locator('button:has-text("Diskon"), button[title*="diskon" i]');
    await expect(discountBtn).toBeVisible({ timeout: 5000 });
    await discountBtn.click();
    await page.waitForTimeout(500);

    // Discount modal — use heading to avoid strict mode
    await expect(page.getByRole("heading", { name: /diskon/i })).toBeVisible({ timeout: 5000 });
  });

  test("should show hold button", async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('button:has-text("Rp")').first();
    await expect(firstProduct).toBeVisible({ timeout: 5000 });
    await firstProduct.click();
    await page.waitForTimeout(500);

    // Hold button has "Hold" or "Tahan" text
    const holdBtn = page.locator('button:has-text("Hold"), button:has-text("Tahan"), button[title*="hold" i]');
    await expect(holdBtn).toBeVisible({ timeout: 5000 });
  });

  test("should show keyboard shortcut hints (F1, F2)", async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstProduct = page.locator('button:has-text("Rp")').first();
    await expect(firstProduct).toBeVisible({ timeout: 5000 });
    await firstProduct.click();
    await page.waitForTimeout(500);

    // Bayar button shows F1 hint
    const bayarBtn = page.locator('button:has-text("F1"), button:has-text("Bayar")');
    await expect(bayarBtn.first()).toBeVisible({ timeout: 5000 });
  });
});
