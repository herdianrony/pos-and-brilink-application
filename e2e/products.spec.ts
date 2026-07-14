import { test, expect } from "@playwright/test";

// ── E2E: Products Management Flow ────────────────
// Test: view products, search, add product, categories

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });
  await page.fill('input[placeholder*="username" i]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });

  // Navigate to Products
  await page.click('button:has-text("Produk")');
  await page.waitForTimeout(2000);
});

test.describe("Products Flow", () => {
  test("should display products tab", async ({ page }) => {
    await expect(page.locator("text=/manajemen|produk/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show Tambah Produk button", async ({ page }) => {
    await expect(page.locator('button:has-text("Tambah Produk")')).toBeVisible({ timeout: 5000 });
  });

  test("should display product list", async ({ page }) => {
    await page.waitForTimeout(2000);
    // Should see at least one product (from seed data)
    const products = page.locator("text=/indomie|aqua|surya|beras/i");
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should search products", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="cari" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Indomie");
      await page.waitForTimeout(1000);
      await expect(page.locator("text=/indomie/i").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should open add product modal", async ({ page }) => {
    await page.click('button:has-text("Tambah Produk")');
    await page.waitForTimeout(500);

    // Should see modal with form fields
    await expect(page.locator("text=/nama produk/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/barcode/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/harga jual/i")).toBeVisible({ timeout: 5000 });
  });

  test("should show foto produk upload in modal", async ({ page }) => {
    await page.click('button:has-text("Tambah Produk")');
    await page.waitForTimeout(500);

    // Should see foto produk upload section
    await expect(page.locator("text=/foto produk/i")).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Categories tab", async ({ page }) => {
    // Click Kategori Produk tab
    await page.click('button:has-text("Kategori Produk")');
    await page.waitForTimeout(1000);

    // Should see category cards
    await expect(page.locator("text=/makanan|minuman|sembako|snack/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show product count per category", async ({ page }) => {
    // Navigate to categories
    await page.click('button:has-text("Kategori Produk")');
    await page.waitForTimeout(1000);

    // Should see product count (e.g., "1 produk", "2 produk")
    await expect(page.locator("text=/\\d+ produk/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Layanan tab", async ({ page }) => {
    // Click Layanan tab
    const layananTab = page.locator('button:has-text("Layanan")').first();
    if (await layananTab.isVisible()) {
      await layananTab.click();
      await page.waitForTimeout(1000);

      // Should see services management
      await expect(page.locator("text=/transfer|tarik|setor|token|pulsa/i").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show Tambah Layanan button", async ({ page }) => {
    const layananTab = page.locator('button:has-text("Layanan")').first();
    if (await layananTab.isVisible()) {
      await layananTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('button:has-text("Tambah Layanan")')).toBeVisible({ timeout: 5000 });
    }
  });
});
