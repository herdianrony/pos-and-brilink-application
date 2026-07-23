import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Keuangan Page", () => {
  test("view Kas & Saldo tab with account cards", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();

    // Kas & Saldo tab (default)
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();
    await expect(page.getByText("Kas Tunai")).toBeVisible({ timeout: 5000 });

    // Verify action buttons exist
    await expect(page.getByRole("button", { name: /Tambah Rekening/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Transfer Saldo/ })).toBeVisible();
  });

  test("view Rekening Koran tab", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Rekening Koran" }).click();

    // Verify filter section
    await expect(page.getByText("Rekening")).toBeVisible();
  });

  test("view Laporan tab", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Laporan" }).click();

    // Verify report section
    await expect(page.getByText("Ringkasan")).toBeVisible({ timeout: 5000 });
  });
});
