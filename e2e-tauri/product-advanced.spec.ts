import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Product Management Advanced", () => {
  test("edit existing product name and price", async ({ page }) => {
    const uniqueProduct = `Produk Edit ${Date.now()}`;
    await login(page);

    // Create product first
    await page.getByRole("button", { name: "Produk" }).click();
    await expect(
      page.getByRole("heading", { name: "Manajemen Data" })
    ).toBeVisible();

    const catExists = await page.getByText("Snack").isVisible();
    if (!catExists) {
      await page.getByRole("button", { name: "Tambah Kategori" }).click();
      await page
        .getByPlaceholder("Contoh: Rokok, Snack, Aksesoris")
        .fill("Snack");
      await page.getByRole("button", { name: "Simpan Kategori" }).click();
    }

    await page.getByRole("button", { name: "Tambah Produk" }).first().click();
    await page.getByLabel("Nama Produk").fill(uniqueProduct);
    await page.getByLabel("Kategori").selectOption({ label: "Snack" });
    await page.getByLabel(/Harga Beli/).fill("3000");
    await page.getByLabel("Harga Jual").fill("5000");
    await page.getByLabel("Stok", { exact: true }).fill("50");
    await page.getByRole("button", { name: "Simpan Produk" }).click();
    await expect(page.getByText(uniqueProduct)).toBeVisible();

    // Edit product
    const row = page.getByRole("row").filter({ hasText: uniqueProduct });
    await row.getByTitle("Edit produk").click();

    // Change name and price
    const newName = `${uniqueProduct} (edited)`;
    await page.getByLabel("Nama Produk").fill(newName);
    await page.getByLabel(/Harga Jual/).fill("7000");
    await page.getByRole("button", { name: "Simpan Produk" }).click();

    await expect(page.getByText(newName)).toBeVisible();
  });

  test("delete product", async ({ page }) => {
    const uniqueProduct = `Produk Hapus ${Date.now()}`;
    await login(page);

    // Create product
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
    await page.getByLabel("Nama Produk").fill(uniqueProduct);
    await page.getByLabel("Kategori").selectOption({ label: "Snack" });
    await page.getByLabel(/Harga Beli/).fill("2000");
    await page.getByLabel("Harga Jual").fill("4000");
    await page.getByLabel("Stok", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Simpan Produk" }).click();
    await expect(page.getByText(uniqueProduct)).toBeVisible();

    // Delete product
    const row = page.getByRole("row").filter({ hasText: uniqueProduct });
    await row.getByTitle("Hapus produk").click();

    // Confirm deletion if dialog appears
    const confirmBtn = page.getByRole("button", { name: /hapus|ya|konfirmasi/i });
    const confirmVisible = await confirmBtn.isVisible().catch(() => false);
    if (confirmVisible) {
      await confirmBtn.click();
    }

    // Product should be gone
    await expect(page.getByText(uniqueProduct)).not.toBeVisible();
  });

  test("search products by name", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Produk" }).click();
    await expect(
      page.getByRole("heading", { name: "Manajemen Data" })
    ).toBeVisible();

    // Search for non-existent product
    await page
      .getByPlaceholder(/cari produk/i)
      .fill("ProdukTidakAdaDunia");
    await expect(
      page.getByText("Produk tidak ditemukan")
    ).toBeVisible();
  });
});
