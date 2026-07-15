import { test, expect } from "@playwright/test";

// ── E2E: Settings & User Management Flow ─────────
// F-06: Auth via storageState. Settings now uses tabs.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.click('button:has-text("Pengaturan")');
  await page.waitForTimeout(2000);
});

test.describe("Settings Flow", () => {
  test("should display settings page", async ({ page }) => {
    await expect(page.locator("text=/pengaturan/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show store info section on Profil tab", async ({ page }) => {
    // Profil tab is default — should show "Informasi Usaha" heading
    await expect(page.getByRole("heading", { name: /informasi usaha/i })).toBeVisible({ timeout: 5000 });
  });

  test("should show save button per section", async ({ page }) => {
    // Each section has its own save button
    await expect(page.getByRole("button", { name: /simpan informasi usaha/i })).toBeVisible({ timeout: 5000 });
  });

  test("should show printer tab", async ({ page }) => {
    await page.click('button:has-text("Printer")');
    await page.waitForTimeout(1000);
    // PrinterSettings component should be visible
    await expect(page.locator("text=/printer|thermal/i").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("User Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Click Pengguna tab
    await page.click('button:has-text("Pengguna")');
    await page.waitForTimeout(2000);
  });

  test("should display user management section", async ({ page }) => {
    await expect(page.locator("text=/manajemen pengguna|manajemen user|pengguna/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show Tambah User button", async ({ page }) => {
    await expect(page.locator('button:has-text("Tambah User")')).toBeVisible({ timeout: 5000 });
  });

  test("should list existing users", async ({ page }) => {
    await expect(page.locator("text=/admin|administrator/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show user role badges", async ({ page }) => {
    await expect(page.locator("text=/administrator|kasir/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should open add user modal", async ({ page }) => {
    await page.click('button:has-text("Tambah User")');
    await page.waitForTimeout(500);

    await expect(page.locator("label:has-text('Nama Lengkap')")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("label:has-text('Username')")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("label:has-text('Password')")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("label:has-text('Role')")).toBeVisible({ timeout: 5000 });
  });

  test("should show role options in form", async ({ page }) => {
    await page.click('button:has-text("Tambah User")');
    await page.waitForTimeout(500);

    const roleSelect = page.locator('select').filter({ hasText: /Kasir|Admin/i }).first();
    await expect(roleSelect).toBeVisible({ timeout: 5000 });
    const options = roleSelect.locator("option");
    const optCount = await options.count();
    expect(optCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Cash & Saldo Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.click('button:has-text("Kas"), button:has-text("Saldo")');
    await page.waitForTimeout(2000);
  });

  test("should display account cards", async ({ page }) => {
    await expect(page.locator("text=/kas tunai|saldo/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should show account names", async ({ page }) => {
    await expect(page.locator("text=/m-banking bri|kas tunai|dana|ovo|gopay/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show balance amounts", async ({ page }) => {
    await expect(page.locator("text=/Rp/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should show action buttons on account cards", async ({ page }) => {
    const adjustBtn = page.locator('button:has-text("Sesuaikan")').first();
    const transferBtn = page.locator('button:has-text("Transfer")').first();
    const adjustVisible = await adjustBtn.isVisible().catch(() => false);
    const transferVisible = await transferBtn.isVisible().catch(() => false);
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
    await expect(page.locator('button:has-text("Hari Ini")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Bulan Ini")')).toBeVisible({ timeout: 5000 });
  });

  test("should show export buttons", async ({ page }) => {
    await expect(page.locator('button:has-text("CSV")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Print")')).toBeVisible({ timeout: 5000 });
  });
});
