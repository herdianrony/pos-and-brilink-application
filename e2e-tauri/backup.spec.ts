import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Backup & Restore", () => {
  test("open Backup tab and verify backup button", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await expect(
      page.getByRole("heading", { name: "Pengaturan" })
    ).toBeVisible();

    // Go to Backup tab
    await page.getByRole("tab", { name: "Backup" }).click();
    await expect(page.getByText("Cadangkan & Pulihkan Data")).toBeVisible();

    // Verify backup button exists
    await expect(
      page.getByRole("button", { name: "Cadangkan Data" })
    ).toBeVisible();
  });

  test("perform database backup", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Backup" }).click();

    // Click backup button
    await page.getByRole("button", { name: "Cadangkan Data" }).click();

    // Wait for backup to complete (button text may change temporarily)
    // After completion, a backup entry should appear
    await expect(
      page.getByRole("button", { name: "Pulihkan" }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("verify CSV download buttons exist", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Backup" }).click();

    await expect(page.getByText("Unduh Data CSV")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Transaksi" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mutasi Saldo" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Utang" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Produk" })
    ).toBeVisible();
  });
});
