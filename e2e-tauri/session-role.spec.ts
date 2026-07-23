import { expect, test } from "@playwright/test";

async function loginAs(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill(username);
  await page.getByPlaceholder("Masukkan password").fill(password);
  await page.getByRole("button", { name: /masuk/i }).click();
}

test.describe("Session Persistence", () => {
  test("session survives page refresh", async ({ page }) => {
    await loginAs(page, "admin", "Admin123");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Refresh page
    await page.reload();

    // Should still be logged in (session persisted)
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Role-Based Access", () => {
  test("admin sees all 6 menu items", async ({ page }) => {
    await loginAs(page, "admin", "Admin123");

    // Admin should see all menus
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kasir POS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Layanan Agen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Transaksi" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keuangan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pengaturan" })).toBeVisible();
  });
});

test.describe("Logout", () => {
  test("logout returns to login page", async ({ page }) => {
    await loginAs(page, "admin", "Admin123");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Click logout
    await page.getByLabel("Keluar").click();

    // Should return to login
    await expect(page.getByRole("heading", { name: "Masuk ke Aplikasi" })).toBeVisible({ timeout: 5000 });
  });
});
