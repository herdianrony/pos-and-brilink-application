import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Account Operations", () => {
  test("view account cards in Kas & Saldo", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();

    // Verify Kas Tunai card
    await expect(page.getByText("Kas Tunai")).toBeVisible({ timeout: 5000 });

    // Verify action buttons
    await expect(page.getByRole("button", { name: /Tambah Rekening/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Transfer Saldo/ })).toBeVisible();
  });

  test("open add account dialog", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();

    // Click add account
    await page.getByRole("button", { name: /Tambah Rekening/ }).click();

    // Verify dialog opens
    await expect(page.getByText("Tambah Rekening")).toBeVisible({ timeout: 5000 });

    // Verify form fields
    await expect(page.getByText("Kode")).toBeVisible();
    await expect(page.getByText("Nama")).toBeVisible();
  });

  test("view mutations in Rekening Koran", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Rekening Koran" }).click();

    // Verify filter section
    await expect(page.getByText("Rekening")).toBeVisible({ timeout: 5000 });
  });
});
