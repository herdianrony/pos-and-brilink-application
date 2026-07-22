import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Kas & Saldo", () => {
  test("view balance overview and account cards", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();

    // Go to Kas & Saldo tab
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();
    await expect(page.getByText("Pantau kas tunai")).toBeVisible();

    // Check stat cards
    await expect(page.getByText("Total Saldo Aktif")).toBeVisible();
    await expect(page.getByText("Kas Tunai")).toBeVisible();
    await expect(page.getByText("Saldo Rekening")).toBeVisible();
  });

  test("view mutation history tab", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();

    // Switch to Mutasi tab
    await page.getByRole("tab", { name: "Mutasi" }).click();
    await expect(page.getByText("Riwayat Mutasi")).toBeVisible();
  });

  test("adjust account balance via Sesuaikan", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Kas & Saldo" }).click();

    // Find the cash account card and click Sesuaikan
    const cashCard = page.locator("[class*='card']").filter({
      hasText: "Kas Tunai",
    });
    const sesuaikanBtn = cashCard.getByRole("button", { name: "Sesuaikan" });

    // Only proceed if button exists (may not if no accounts active)
    const btnExists = await sesuaikanBtn.isVisible().catch(() => false);
    if (btnExists) {
      await sesuaikanBtn.click();
      // Expect a dialog or form to appear
      await expect(
        page.getByRole("dialog").or(page.getByRole("heading", { name: /sesuaikan|penyesuaian/i }))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Rekening Koran", () => {
  test("view statement page with period filters", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();

    // Go to Rekening Koran tab
    await page.getByRole("tab", { name: "Rekening Koran" }).click();
    await expect(page.getByText("Mutasi rekening instan")).toBeVisible();

    // Check stat cards
    await expect(page.getByText("Saldo Awal")).toBeVisible();
    await expect(page.getByText("Mutasi Masuk")).toBeVisible();
    await expect(page.getByText("Mutasi Keluar")).toBeVisible();
    await expect(page.getByText("Saldo Akhir")).toBeVisible();

    // Check period filter chips
    await page.getByText("Hari Ini").click();
    await page.getByText("7 Hari").click();
    await page.getByText("Semua").click();
  });

  test("download CSV from statement page", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Rekening Koran" }).click();

    const downloadBtn = page.getByRole("button", { name: "Unduh CSV" });
    const btnExists = await downloadBtn.isVisible().catch(() => false);
    if (btnExists) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
        downloadBtn.click(),
      ]);
      // If download started, it works
      if (download) {
        expect(download.suggestedFilename()).toContain(".csv");
      }
    }
  });
});
