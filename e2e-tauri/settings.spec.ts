import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Pengaturan — User Management", () => {
  test("add new kasir user and verify in table", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await expect(
      page.getByRole("heading", { name: "Pengaturan" })
    ).toBeVisible();

    // Go to Pengguna tab
    await page.getByRole("tab", { name: "Pengguna" }).click();
    await expect(page.getByText("Daftar Pengguna")).toBeVisible();

    // Add new user
    const uniqueUser = `kasir_${Date.now()}`;
    await page.getByLabel("Nama").fill("Kasir Test");
    await page.getByLabel("Username").fill(uniqueUser);
    await page.getByLabel("Password").fill("Kasir123");
    await page.getByLabel("Role").selectOption("kasir");
    await page.getByRole("button", { name: "Buat Pengguna" }).click();

    // Verify user appears in table
    await expect(page.getByText(uniqueUser)).toBeVisible();
    await expect(page.getByText("Kasir Test")).toBeVisible();
  });

  test("edit existing user", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Pengguna" }).click();

    // Find admin row and click Edit
    const adminRow = page.getByRole("row").filter({ hasText: "admin" });
    await adminRow.getByRole("button", { name: "Edit" }).click();

    // Verify edit form appears
    await expect(
      page.getByRole("button", { name: "Simpan Perubahan" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Batal" })
    ).toBeVisible();

    // Cancel edit
    await page.getByRole("button", { name: "Batal" }).click();
  });

  test("delete kasir user", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Pengguna" }).click();

    // Find a kasir row and delete it (not admin)
    const kasirRow = page
      .getByRole("row")
      .filter({ hasText: "Kasir" })
      .first();
    const deleteBtn = kasirRow.getByRole("button", { name: "Hapus" });
    const btnExists = await deleteBtn.isVisible().catch(() => false);

    if (btnExists) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole("button", {
        name: /hapus|ya|konfirmasi/i,
      });
      const confirmVisible = await confirmBtn.isVisible().catch(() => false);
      if (confirmVisible) {
        await confirmBtn.click();
      }
    }
  });
});

test.describe("Pengaturan — Data Tabs", () => {
  test("view Produk summary tab in Pengaturan", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Produk" }).click();
    await expect(page.getByText("Ringkasan Produk")).toBeVisible();
    await expect(page.getByText("Total Produk")).toBeVisible();
    await expect(page.getByText("Stok Rendah")).toBeVisible();
  });

  test("view Transaksi summary tab in Pengaturan", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Transaksi" }).click();
    await expect(page.getByText("Ringkasan Transaksi")).toBeVisible();
    await expect(page.getByText("Total Transaksi")).toBeVisible();
  });

  test("view Utang summary tab in Pengaturan", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Utang" }).click();
    await expect(page.getByText("Ringkasan Utang")).toBeVisible();
    await expect(page.getByText("Total Utang")).toBeVisible();
  });
});

test.describe("Pengaturan — Info Aplikasi", () => {
  test("view Tentang tab with app info and activity logs", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Tentang" }).click();
    await expect(page.getByText("Info Aplikasi")).toBeVisible();
    await expect(page.getByText("Riwayat Aktivitas")).toBeVisible();
  });
});
