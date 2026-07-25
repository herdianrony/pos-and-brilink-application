import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Layanan Agen", () => {
  test("open agent services page and verify presets", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Layanan Agen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Layanan Agen" }).first()).toBeVisible({ timeout: 5000 });

    // Verify service presets
    await expect(page.getByRole("button", { name: /Transfer/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Tarik Tunai/ }).first()).toBeVisible();
  });
});

test.describe("Debt Management via Settings", () => {
  test("open debt management from Settings", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Utang" }).click();

    // Verify debt management UI
    await expect(page.getByText("Buku Utang")).toBeVisible();
    await expect(page.getByRole("button", { name: /Tambah Utang/ })).toBeVisible();
  });
});
