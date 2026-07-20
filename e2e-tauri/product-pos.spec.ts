import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Operasional" })).toBeVisible();
}

test.describe("CatatAgen Tauri product and POS", () => {
  test("adds product via dialog and checks out POS with receipt", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "Produk" }).click();
    await expect(page.getByRole("heading", { name: "Produk & Kategori" })).toBeVisible();

    await page.getByRole("button", { name: "Tambah Kategori" }).click();
    await page.getByPlaceholder("Contoh: Rokok, Snack, Aksesoris").fill("Snack");
    await page.getByRole("button", { name: "Simpan Kategori" }).click();
    await expect(page.getByText("Snack")).toBeVisible();

    await page.getByRole("button", { name: "Tambah Produk" }).click();
    await page.getByLabel("Nama Produk").fill("Kopi Botol");
    await page.getByLabel("Kategori").selectOption({ label: "Snack" });
    await page.getByLabel(/Harga Beli/).fill("5000");
    await page.getByLabel("Harga Jual").fill("8000");
    await page.getByLabel("Stok", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Simpan Produk" }).click();
    await expect(page.getByText("Kopi Botol")).toBeVisible();

    await page.getByRole("button", { name: "Kasir POS" }).click();
    await expect(page.getByRole("heading", { name: "Kasir POS" })).toBeVisible();
    await page.getByRole("button", { name: "Tambah" }).first().click();
    await expect(page.getByText("1 item dipilih.")).toBeVisible();
    await page.getByRole("button", { name: "Bayar Tunai" }).click();

    await expect(page.getByRole("heading", { name: "Struk Penjualan" })).toBeVisible();
    await expect(page.getByText("Kopi Botol").first()).toBeVisible();
    await expect(page.getByText(/Rp\s?8\.000|Rp8\.000/).first()).toBeVisible();
  });
});
