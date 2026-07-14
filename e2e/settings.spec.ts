import { test, expect } from "@playwright/test";

// ── E2E: Settings & User Management Flow ─────────
// Test: settings page, branding, user CRUD, printer settings

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });
  await page.fill('input[placeholder*="username" i]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });

  // Navigate to Settings
  await page.click('button:has-text("Pengaturan")');
  await page.waitForTimeout(2000);
});

test.describe("Settings Flow", () => {
  test("should display settings page", async ({ page }) => {
    await expect(page.locator("text=/pengaturan|branding|toko/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show branding section", async ({ page }) => {
    await expect(page.locator("text=/branding/i")).toBeVisible({ timeout: 5000 });
  });

  test("should show store info section", async ({ page }) => {
    await expect(page.locator("text=/informasi toko|nama toko/i")).toBeVisible({ timeout: 5000 });
  });

  test("should show save button", async ({ page }) => {
    await expect(page.locator('button:has-text("Simpan")')).toBeVisible({ timeout: 5000 });
  });

  test("should show printer settings section", async ({ page }) => {
    await expect(page.locator("text=/printer|thermal/i")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("User Management Flow", () => {
  test("should display user management section", async ({ page }) => {
    await expect(page.locator("text=/manajemen pengguna|manajemen user/i")).toBeVisible({ timeout: 10000 });
  });

  test("should show Tambah User button", async ({ page }) => {
    await expect(page.locator('button:has-text("Tambah User")')).toBeVisible({ timeout: 5000 });
  });

  test("should list existing users", async ({ page }) => {
    // Should see at least admin user
    await expect(page.locator("text=/admin|administrator/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show user role badges", async ({ page }) => {
    // Should see role indicator (Administrator/Kasir)
    await expect(page.locator("text=/administrator|kasir/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should open add user modal", async ({ page }) => {
    await page.click('button:has-text("Tambah User")');
    await page.waitForTimeout(500);

    // Should see modal with form fields
    await expect(page.locator("text=/nama lengkap/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/username/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/password/i")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/role/i")).toBeVisible({ timeout: 5000 });
  });

  test("should show role options in form", async ({ page }) => {
    await page.click('button:has-text("Tambah User")');
    await page.waitForTimeout(500);

    // Should see role dropdown with options
    const roleSelect = page.locator('select').filter({ hasText: /kasir|admin/i });
    if (await roleSelect.isVisible()) {
      // Check options exist
      await expect(roleSelect.locator('option:has-text("Kasir")')).toBeVisible();
      await expect(roleSelect.locator('option:has-text("Admin")')).toBeVisible();
    }
  });
});

test.describe("Cash & Saldo Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Cash page
    await page.click('button:has-text("Kas"), button:has-text("Saldo")');
    await page.waitForTimeout(2000);
  });

  test("should display account cards", async ({ page }) => {
    // Should see account cards (Kas Tunai, M-Banking BRI, etc.)
    await expect(page.locator("text=/kas tunai|saldo/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show account names", async ({ page }) => {
    // Should see at least one bank name
    await expect(page.locator("text=/bri|bca|mandiri|bni/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show balance amounts", async ({ page }) => {
    // Should see Rp amounts
    await expect(page.locator("text=/Rp/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show action buttons on account cards", async ({ page }) => {
    // Should see Sesuaikan/Transfer buttons
    const adjustBtn = page.locator('button:has-text("Sesuaikan")');
    const transferBtn = page.locator('button:has-text("Transfer")');
    // At least one should be visible
    const adjustVisible = await adjustBtn.first().isVisible().catch(() => false);
    const transferVisible = await transferBtn.first().isVisible().catch(() => false);
    expect(adjustVisible || transferVisible).toBe(true);
  });
});

test.describe("Rekening Koran Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.click('button:has-text("Rekening Koran")');
    await page.waitForTimeout(2000);
  });

  test("should display rekening koran page", async ({ page }) => {
    await expect(page.locator("text=/rekening koran|mutasi/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show account selector", async ({ page }) => {
    await expect(page.locator('select, input[type="date"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("should show date range filters", async ({ page }) => {
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should show preset date buttons", async ({ page }) => {
    await expect(page.locator('button:has-text("Hari Ini"), button:has-text("Bulan Ini")')).toBeVisible({ timeout: 5000 });
  });

  test("should show export buttons", async ({ page }) => {
    await expect(page.locator('button:has-text("CSV"), button:has-text("Print")')).toBeVisible({ timeout: 5000 });
  });
});
