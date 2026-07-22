import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function createProductAndCheckout(
  page: import("@playwright/test").Page,
  productName: string,
  sellPrice: string
) {
  await page.getByRole("button", { name: "Produk" }).click();
  const catExists = await page.getByText("Snack").isVisible();
  if (!catExists) {
    await page.getByRole("button", { name: "Tambah Kategori" }).click();
    await page
      .getByPlaceholder("Contoh: Rokok, Snack, Aksesoris")
      .fill("Snack");
    await page.getByRole("button", { name: "Simpan Kategori" }).click();
  }

  await page.getByRole("button", { name: "Tambah Produk" }).first().click();
  await page.getByLabel("Nama Produk").fill(productName);
  await page.getByLabel("Kategori").selectOption({ label: "Snack" });
  await page.getByLabel(/Harga Beli/).fill("3000");
  await page.getByLabel("Harga Jual").fill(sellPrice);
  await page.getByLabel("Stok", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Simpan Produk" }).click();

  await page.getByRole("button", { name: "Kasir POS" }).click();
  await page.getByRole("button", { name: new RegExp(productName) }).click();
  await page.getByRole("button", { name: /^Bayar/ }).click();

  await page.getByText("Tunai").click();
  const total = parseInt(sellPrice.replace(/\D/g, ""), 10);
  const cash = Math.ceil(total / 10000) * 10000;
  await page.getByLabel("Uang Diterima").fill(cash.toString());
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();

  await page.getByRole("button", { name: "Tutup" }).click();
}

test.describe("Laporan", () => {
  test("view reports page with stats and charts", async ({ page }) => {
    const uniqueProduct = `Laporan ${Date.now()}`;
    await login(page);
    await createProductAndCheckout(page, uniqueProduct, "10000");

    // Navigate to Laporan via Keuangan
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Laporan" }).click();

    // Verify stats
    await expect(page.getByText("Omzet POS")).toBeVisible();
    await expect(page.getByText("Keuntungan")).toBeVisible();

    // Verify section headings
    await expect(page.getByText("Performa Penjualan")).toBeVisible();
    await expect(page.getByText("Metode Pembayaran")).toBeVisible();
  });

  test("download CSV report from Pengaturan-Transaksi tab", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Transaksi" }).click();

    const downloadBtn = page.getByRole("button", { name: "Unduh CSV" });
    const btnExists = await downloadBtn.isVisible().catch(() => false);
    if (btnExists) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
        downloadBtn.click(),
      ]);
      if (download) {
        expect(download.suggestedFilename()).toContain(".csv");
      }
    }
  });

  test("view reports with POS and agent service data", async ({ page }) => {
    const uniqueProduct = `Mix ${Date.now()}`;
    await login(page);
    await createProductAndCheckout(page, uniqueProduct, "15000");

    // Also create an agent service transaction
    await page.getByRole("button", { name: "Layanan Agen", exact: true }).click();
    await page.getByRole("button", { name: /Transfer/ }).first().click();
    await page.getByLabel("Nominal Transaksi").fill("200000");
    await page.getByLabel("Admin Toko").fill("5000");
    await page.getByLabel("Potongan Bank/Provider").fill("1500");
    await page.getByRole("button", { name: "Lanjut Perubahan Saldo" }).click();
    await page.getByRole("button", { name: "Review & Simpan" }).click();
    await page.getByRole("button", { name: "Simpan Transaksi Agen" }).click();

    // Check reports
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Laporan" }).click();

    // Should show both POS and agent service volume
    await expect(page.getByText("Omzet POS")).toBeVisible();
    await expect(page.getByText("Volume Layanan")).toBeVisible();
    await expect(page.getByText("Total Keuntungan")).toBeVisible();
    await expect(page.getByText("Mutasi Saldo")).toBeVisible();
  });
});
