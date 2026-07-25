import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Settings - All Tabs", () => {
  test("navigate through all settings tabs", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await expect(page.getByRole("heading", { name: "Pengaturan" })).toBeVisible();

    // Pengguna tab (default)
    await page.getByRole("tab", { name: "Pengguna" }).click();
    await expect(page.getByText("Daftar Pengguna")).toBeVisible();

    // Produk tab
    await page.getByRole("tab", { name: "Produk" }).click();
    await expect(page.getByText("Ringkasan Produk")).toBeVisible();

    // Utang tab
    await page.getByRole("tab", { name: "Utang" }).click();
    await expect(page.getByText("Belum ada data utang")).toBeVisible();

    // WhatsApp tab
    await page.getByRole("tab", { name: "WhatsApp" }).click();
    await expect(page.getByText("Status WhatsApp")).toBeVisible();

    // Backup & Export tab
    await page.getByRole("tab", { name: "Backup & Export" }).click();
    await expect(page.getByText("Cadangkan & Pulihkan Data")).toBeVisible();

    // Tentang & Log tab
    await page.getByRole("tab", { name: "Tentang & Log" }).click();
    await expect(page.getByText("Audit Log")).toBeVisible();
  });
});

test.describe("Settings - User Management", () => {
  test("open add user modal and verify form", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Pengguna" }).click();

    // Click Tambah button to open modal
    await page.getByRole("button", { name: "Tambah" }).click();
    await expect(page.getByRole("heading", { name: "Tambah Pengguna" })).toBeVisible();

    // Verify form fields in modal
    await expect(page.getByPlaceholder("Nama lengkap")).toBeVisible();
    await expect(page.getByPlaceholder("Username login")).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Batal" }).click();
  });
});

test.describe("Settings - Audit Log", () => {
  test("filter audit log by level", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Tentang & Log" }).click();

    // Verify audit log section
    await expect(page.getByText("Audit Log")).toBeVisible();

    // Verify filter chips exist
    await expect(page.getByRole("tab", { name: /Semua/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Info" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Warning/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Error/ })).toBeVisible();
  });
});
