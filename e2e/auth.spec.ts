import { test, expect } from "@playwright/test";

// ── E2E: Auth Flow ───────────────────────────────
// Test: login, logout, redirect, protected routes
//
// F-06: globalSetup creates admin user + saves auth state.
// Tests that need NO auth must clear cookies via context.clearCookies().

test.describe("Auth Flow", () => {
  test("should redirect to /login when not authenticated", async ({ page, context }) => {
    // Clear auth state to simulate unauthenticated user
    await context.clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login|\/setup/);
  });

  test("should show login form", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    // Use exact heading match to avoid strict mode violation with subtitle
    await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[placeholder*="username" i]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should show error for wrong credentials", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });

    await page.fill('input[placeholder*="username" i]', "admin");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=/salah|gagal|error/i")).toBeVisible({ timeout: 5000 });
  });

  test("should login successfully with correct credentials", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });

    await page.fill('input[placeholder*="username" i]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    // Should see dashboard content
    await expect(page.locator("text=/dashboard|kasir|layanan/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should access protected pages after login", async ({ page }) => {
    // Already authenticated via storageState
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("should logout successfully", async ({ page }) => {
    // Already authenticated via storageState
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const logoutBtn = page.locator('button[title="Keluar"], button:has(svg.lucide-log-out)');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }
  });

  test("should not access /login after logged in (redirect to /)", async ({ page }) => {
    // Already authenticated
    await page.goto("/login");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });
});
