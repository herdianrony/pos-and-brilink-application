import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Operasional" })).toBeVisible();
}

test.describe("CatatAgen Tauri agent and debt workflows", () => {
  test("records agent fee with provider cost and copies debt reminder", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "Layanan Agen" }).click();
    await expect(page.getByRole("heading", { name: "Layanan Agen" })).toBeVisible();
    await page.getByRole("button", { name: /Transfer/ }).first().click();
    await page.getByLabel("Nominal Transaksi").fill("100000");
    await page.getByLabel("Admin Toko / Fee").fill("5000");
    await page.getByLabel("Biaya Modal Provider").fill("1000");
    await expect(page.getByText(/Estimasi Profit Jasa/)).toBeVisible();
    await page.getByRole("button", { name: "Lanjut Efek Saldo" }).click();
    await page.getByRole("button", { name: "Review & Simpan" }).click();
    await expect(page.getByText("Profit Jasa")).toBeVisible();
    await expect(page.getByText(/Rp\s?4\.000|Rp4\.000/)).toBeVisible();
    await page.getByRole("button", { name: "Simpan Transaksi Agen" }).click();
    await expect(page.getByText("Transaksi layanan agen berhasil dicatat")).toBeVisible();

    await page.getByRole("button", { name: "Buku Utang" }).click();
    await page.getByLabel("Nama Pelanggan").fill("Budi");
    await page.getByLabel("No WhatsApp").fill("628123456789");
    await page.getByLabel("Nominal Utang").fill("25000");
    await page.getByRole("button", { name: "Simpan Utang" }).click();
    await expect(page.getByText("Budi")).toBeVisible();
    await page.getByRole("button", { name: "Salin Reminder" }).click();
    await expect(page.getByText("Pesan pengingat utang disalin")).toBeVisible();
  });
});
