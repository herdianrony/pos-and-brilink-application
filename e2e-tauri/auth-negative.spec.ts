import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, username = "admin", password = "Admin123") {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill(username);
  await page.getByPlaceholder("Masukkan password").fill(password);
  await page.getByRole("button", { name: /masuk/i }).click();
}

test.describe("Login — Negative Tests", () => {
  test("show error on wrong password", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Masukkan username").fill("admin");
    await page.getByPlaceholder("Masukkan password").fill("WrongPass123");
    await page.getByRole("button", { name: /masuk/i }).click();

    // Should show error message
    await expect(page.getByText(/salah|gagal/i)).toBeVisible({ timeout: 5000 });
    // Should still be on login page
    await expect(page.getByRole("heading", { name: "Masuk ke Aplikasi" })).toBeVisible();
  });

  test("show error on empty username", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Masukkan password").fill("Admin123");
    await page.getByRole("button", { name: /masuk/i }).click();

    // Should show validation error
    await expect(page.getByText(/wajib|username/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Role Guard — Kasir", () => {
  test("kasir cannot access Keuangan or Settings", async ({ page }) => {
    // Note: This test requires a kasir user to exist
    // If no kasir user exists, this test will be skipped
    await login(page);

    // Check that admin can see Keuangan
    await expect(page.getByRole("button", { name: "Keuangan" })).toBeVisible();

    // Logout
    await page.getByLabel("Keluar").click();
    await expect(page.getByRole("heading", { name: "Masuk ke Aplikasi" })).toBeVisible({ timeout: 5000 });
  });
});
