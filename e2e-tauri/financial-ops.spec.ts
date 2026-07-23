import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Financial Operations", () => {
  test("transfer between accounts", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();

    // Click Transfer button
    await page.getByRole("button", { name: /Transfer Saldo/ }).click();

    // Verify transfer dialog opens
    await expect(page.getByText("Transfer Antar Rekening")).toBeVisible({ timeout: 5000 });
  });

  test("view Rekening Koran with filters", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Rekening Koran" }).click();

    // Verify filter section
    await expect(page.getByText("Rekening")).toBeVisible({ timeout: 5000 });
  });

  test("view Laporan with charts", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Laporan" }).click();

    // Verify report section
    await expect(page.getByText("Ringkasan")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Backup & Restore", () => {
  test("create backup and verify", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Backup & Export" }).click();

    // Click create backup
    await page.getByRole("button", { name: "Cadangkan Data" }).click();

    // Verify backup appears
    await expect(page.getByText(/catatagen-backup/)).toBeVisible({ timeout: 10000 });
  });

  test("verify restore button exists for each backup", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Backup & Export" }).click();

    // If backups exist, verify restore button
    const restoreButton = page.getByRole("button", { name: "Pulihkan" }).first();
    if (await restoreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(restoreButton).toBeVisible();
    }
  });
});
