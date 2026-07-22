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
  buyPrice: string,
  sellPrice: string,
  stock: string
) {
  // Add category
  await page.getByRole("button", { name: "Produk" }).click();
  await expect(
    page.getByRole("heading", { name: "Produk" })
  ).toBeVisible();

  const categoryExists = await page.getByText("Snack").isVisible();
  if (!categoryExists) {
    await page.getByRole("button", { name: "Tambah Kategori" }).click();
    await page
      .getByPlaceholder("Contoh: Rokok, Snack, Aksesoris")
      .fill("Snack");
    await page.getByRole("button", { name: "Simpan Kategori" }).click();
    await expect(page.getByText("Snack")).toBeVisible();
  }

  // Add product
  await page.getByRole("button", { name: "Tambah Produk" }).first().click();
  await page.getByLabel("Nama Produk").fill(productName);
  await page.getByLabel("Kategori").selectOption({ label: "Snack" });
  await page.getByLabel(/Harga Beli/).fill(buyPrice);
  await page.getByLabel("Harga Jual").fill(sellPrice);
  await page.getByLabel("Stok", { exact: true }).fill(stock);
  await page.getByRole("button", { name: "Simpan Produk" }).click();
  await expect(page.getByText(productName)).toBeVisible();

  // POS checkout — cash payment
  await page.getByRole("button", { name: "Kasir POS" }).click();
  await expect(page.getByRole("heading", { name: "Kasir POS" })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(productName) }).click();
  await page.getByRole("button", { name: /^Bayar/ }).click();

  // Payment modal — Tunai
  await expect(
    page.getByRole("heading", { name: "Konfirmasi Pembayaran" })
  ).toBeVisible();
  await page.getByText("Tunai").click();
  const totalAmount = parseInt(sellPrice.replace(/\D/g, ""), 10);
  const cashAmount = Math.ceil(totalAmount / 10000) * 10000;
  await page.getByLabel("Uang Diterima").fill(cashAmount.toString());
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();

  // Receipt modal — close it
  await expect(
    page.getByRole("heading", { name: "Struk Penjualan" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Tutup" }).click();
}

test.describe("Riwayat Transaksi", () => {
  test("view transaction detail after POS checkout", async ({ page }) => {
    const uniqueProduct = `Es Teh ${Date.now()}`;
    await login(page);
    await createProductAndCheckout(page, uniqueProduct, "3000", "5000", "20");

    // Navigate to Riwayat
    await page.getByRole("button", { name: "Transaksi" }).click();
    await expect(
      page.getByRole("heading", { name: "Riwayat Transaksi" })
    ).toBeVisible();

    // Filter by POS type
    await page.getByText("POS").click();
    await expect(page.getByText(uniqueProduct)).toBeVisible();

    // Open detail
    const row = page.getByRole("row").filter({ hasText: uniqueProduct });
    await row.getByTitle("Lihat detail").click();

    // Check detail modal
    await expect(
      page.getByRole("heading", { name: "Detail Transaksi" })
    ).toBeVisible();
    await expect(page.getByText(uniqueProduct)).toBeVisible();
    await expect(page.getByText("Tunai")).toBeVisible();
    await page.getByRole("button", { name: "Tutup" }).click();
  });

  test("filter transactions by type and status", async ({ page }) => {
    const uniqueProduct = `Kopi Susu ${Date.now()}`;
    await login(page);
    await createProductAndCheckout(page, uniqueProduct, "5000", "8000", "10");

    await page.getByRole("button", { name: "Transaksi" }).click();
    await expect(
      page.getByRole("heading", { name: "Riwayat Transaksi" })
    ).toBeVisible();

    // Verify stats cards
    await expect(page.getByText("transaksi")).toBeVisible();
    await expect(page.getByText("Pendapatan")).toBeVisible();

    // Switch to Semua type tab
    await page.getByText("Semua").first().click();

    // Status filter — click Batal
    await page.getByText("Batal").click();
    await expect(page.getByText("Belum ada transaksi")).toBeVisible();

    // Back to Selesai
    await page.getByText("Selesai").click();
    await expect(page.getByText(uniqueProduct)).toBeVisible();
  });
});
