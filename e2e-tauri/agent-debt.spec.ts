import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("CatatAgen Tauri agent and finance workflows", () => {
  test("records agent fee with provider cost and creates debt from Finance tab", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "Layanan Agen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Layanan Agen", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Transfer/ }).first().click();
    await page.getByPlaceholder("Rp0").nth(0).fill("100000");
    await page.getByPlaceholder("Rp0").nth(1).fill("5000");
    await page.getByPlaceholder("Rp0").nth(2).fill("1000");
    await expect(page.getByText("Estimasi Keuntungan")).toBeVisible();
    await page.getByRole("button", { name: "Lanjut Perubahan Saldo" }).click();
    await page.getByRole("button", { name: "Review & Simpan" }).click();
    await expect(page.getByText("Keuntungan Jasa")).toBeVisible();
    await expect(page.getByText(/Rp\s?4\.000|Rp4\.000/)).toBeVisible();
    await page.getByRole("button", { name: "Simpan Transaksi Agen" }).click();
    await expect(page.getByText("Transaksi layanan agen berhasil dicatat")).toBeVisible();

    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Buku Utang" }).click();
    await page.getByLabel("Nama Pelanggan").fill("Budi");
    await page.getByLabel("No WhatsApp").fill("628123456789");
    await page.getByLabel("Nominal Utang").fill("25000");
    await page.getByRole("button", { name: "Simpan Utang" }).click();
    await expect(page.getByText("Budi")).toBeVisible();
    await page.getByRole("button", { name: /Reminder/i }).first().click();
    await expect(page.getByText("Pesan pengingat utang disalin")).toBeVisible();
  });
});
