import { test, expect } from "@playwright/test";

// ── E2E: Auth Flow ───────────────────────────────
// Test: login, logout, redirect, protected routes

test.describe("Auth Flow", () => {
  test("should redirect to /login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2, h3, p").filter({ hasText: "Masuk" })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[placeholder*="username" i]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should show error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    // Wait for form to appear
    await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });

    await page.fill('input[placeholder*="username" i]', "admin");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=/salah|gagal|error/i")).toBeVisible({ timeout: 5000 });
  });

  test("should login successfully with correct credentials", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });

    await page.fill('input[placeholder*="username" i]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (not /login anymore)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Should see dashboard content
    await expect(page.locator("text=/dashboard/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("should access protected pages after login", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });
    await page.fill('input[placeholder*="username" i]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });

    // Try accessing protected page directly
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });
    await page.fill('input[placeholder*="username" i]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });

    // Find and click logout button
    const logoutBtn = page.locator('button[title="Keluar"], button:has(svg.lucide-log-out)');
    await logoutBtn.click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("should not access /login after logged in (redirect to /)", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.waitForSelector('input[placeholder*="username" i]', { timeout: 15000 });
    await page.fill('input[placeholder*="username" i]', "admin");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });

    // Try accessing /login again
    await page.goto("/login");
    // Should redirect back to /
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });
});
