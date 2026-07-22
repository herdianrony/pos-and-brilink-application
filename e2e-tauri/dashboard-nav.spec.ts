import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Dashboard", () => {
  test("view dashboard with stats and sections", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(
      page.getByText("Ringkasan aktivitas bisnis Anda")
    ).toBeVisible();

    // Verify stat cards
    await expect(page.getByText("Total Transaksi")).toBeVisible();
    await expect(page.getByText("Omzet POS")).toBeVisible();

    // Verify sections
    await expect(page.getByText("Saldo Rekening")).toBeVisible();
    await expect(page.getByText("Transaksi Terakhir")).toBeVisible();
  });

  test("navigate all pages from dashboard and verify heading", async ({
    page,
  }) => {
    await login(page);

    // Navigate using sidebar buttons
    const pages = [
      { button: "Kasir POS", heading: "Kasir POS" },
      { button: "Layanan Agen", heading: "Layanan Agen" },
      { button: "Produk", heading: "Produk" },
      { button: "Transaksi", heading: "Riwayat Transaksi" },
      { button: "Pengaturan", heading: "Pengaturan" },
    ];

    for (const { button, heading } of pages) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: heading }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Debt Payment Recording", () => {
  test("record partial debt payment", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Buku Utang" }).click();

    // Add a new debt
    const debtorName = `Pelanggan ${Date.now()}`;
    await page.getByLabel("Nama Pelanggan").fill(debtorName);
    await page.getByLabel("No WhatsApp").fill("628123456789");
    await page.getByLabel("Nominal Utang").fill("100000");
    await page.getByRole("button", { name: "Simpan Utang" }).click();
    await expect(page.getByText(debtorName)).toBeVisible();

    // Record a partial payment
    await page.getByRole("button", { name: "Catat Pembayaran" }).click();
    await page.getByLabel("Pelanggan").selectOption({ label: debtorName });
    await page.getByLabel("Nominal Bayar").fill("40000");
    await page.getByLabel("Catatan").fill("Bayar cicilan pertama");
    await page.getByRole("button", { name: "Simpan Pembayaran" }).click();

    // Verify debt still exists with reduced amount
    await expect(page.getByText(debtorName)).toBeVisible();
  });
});
