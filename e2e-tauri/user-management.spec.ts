import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("User Management", () => {
  test("create new kasir user via modal", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Pengguna" }).click();

    // Open add user modal
    await page.getByRole("button", { name: "Tambah" }).click();
    await expect(page.getByRole("heading", { name: "Tambah Pengguna" })).toBeVisible();

    // Fill form
    const uniqueName = `Kasir Test ${Date.now()}`;
    await page.getByPlaceholder("Nama lengkap").fill(uniqueName);
    await page.getByPlaceholder("Username login").fill(`kasir${Date.now()}`);
    await page.getByPlaceholder("Min 8 karakter").fill("Kasir123!");

    // Submit
    await page.getByRole("button", { name: "Buat Pengguna" }).click();

    // Verify user appears in table (modal should close)
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5000 });
  });

  test("open edit user modal from table", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Pengguna" }).click();

    // Click edit on first user
    const editButton = page.locator("button[aria-label*='Edit']").first();
    await editButton.click();

    // Verify edit modal opens
    await expect(page.getByRole("heading", { name: "Edit Pengguna" })).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Batal" }).click();
  });
});
