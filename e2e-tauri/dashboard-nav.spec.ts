import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Dashboard", () => {
  test("view dashboard with hero card and sections", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Ringkasan aktivitas bisnis Anda")).toBeVisible();

    // Verify hero card
    await expect(page.getByText("Keuntungan Hari Ini")).toBeVisible();

    // Verify quick saldo link
    await expect(page.getByText("Total Saldo")).toBeVisible();

    // Verify chart section
    await expect(page.getByText("Pendapatan 7 Hari")).toBeVisible();

    // Verify low stock section
    await expect(page.getByText("Stok Menipis")).toBeVisible();
  });

  test("navigate all pages from dashboard", async ({ page }) => {
    await login(page);

    // Navigate to Kasir POS
    await page.getByRole("button", { name: "Kasir POS", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Kasir POS" })).toBeVisible();

    // Navigate to Layanan Agen
    await page.getByRole("button", { name: "Layanan Agen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Layanan Agen" }).first()).toBeVisible({ timeout: 5000 });

    // Navigate to Transaksi
    await page.getByRole("button", { name: "Transaksi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Riwayat Transaksi" })).toBeVisible();

    // Navigate to Keuangan
    await page.getByRole("button", { name: "Keuangan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Keuangan" })).toBeVisible();

    // Navigate to Pengaturan
    await page.getByRole("button", { name: "Pengaturan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Pengaturan" })).toBeVisible();
  });
});

test.describe("KeuanganPage Tabs", () => {
  test("switch between Kas & Saldo, Rekening Koran, and Laporan tabs", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan", exact: true }).click();

    // Kas & Saldo tab (default)
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();
    await expect(page.getByText("Kas Tunai")).toBeVisible({ timeout: 5000 });

    // Rekening Koran tab
    await page.getByRole("tab", { name: "Rekening Koran" }).click();
    await expect(page.getByText("Rekening")).toBeVisible({ timeout: 5000 });

    // Laporan tab
    await page.getByRole("tab", { name: "Laporan" }).click();
    await expect(page.getByText("Ringkasan")).toBeVisible({ timeout: 5000 });
  });
});
