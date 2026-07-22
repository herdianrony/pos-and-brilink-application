import { test, expect } from "@playwright/test";

// ── E2E: Products Management Flow ────────────────
// Test: view products, search, add product, categories

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

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
    const products = page.locator("text=/indomie|aqua|surya|beras/i");
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should search products", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="cari" i], input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill("Indomie");
    await page.waitForTimeout(1000);
    await expect(page.locator("text=/indomie/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should open add product modal", async ({ page }) => {
    await page.click('button:has-text("Tambah Produk")');
    await page.waitForTimeout(500);

    // Should see modal with form fields — use label text
    await expect(page.locator("label:has-text('Nama Produk')")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/barcode/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("label:has-text('Harga Jual')")).toBeVisible({ timeout: 5000 });
  });

  test("should show foto produk upload in modal", async ({ page }) => {
    await page.click('button:has-text("Tambah Produk")');
    await page.waitForTimeout(500);

    await expect(page.locator("text=/foto produk/i")).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Categories tab", async ({ page }) => {
    await page.click('button:has-text("Kategori Produk")');
    await page.waitForTimeout(1000);
    await expect(page.locator("text=/makanan|minuman|sembako|snack/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show product count per category", async ({ page }) => {
    await page.click('button:has-text("Kategori Produk")');
    await page.waitForTimeout(1000);
    await expect(page.locator("text=/\\d+ produk/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Layanan tab", async ({ page }) => {
    // The Layanan tab is inside the Tabs container (bg-slate-100/80), not the sidebar
    // Use .last() to pick the tab button (appears after sidebar in DOM)
    const layananTab = page.locator('button:has-text("Layanan Agen")').last();
    await expect(layananTab).toBeVisible({ timeout: 5000 });
    await layananTab.click();
    await page.waitForTimeout(1000);

    await expect(page.locator("text=/transfer|tarik|setor|token|pulsa/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show Tambah Layanan button", async ({ page }) => {
    const layananTab = page.locator('button:has-text("Layanan Agen")').last();
    await expect(layananTab).toBeVisible({ timeout: 5000 });
    await layananTab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Tambah Layanan")')).toBeVisible({ timeout: 5000 });
  });
});
