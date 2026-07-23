import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Reports via Keuangan Page", () => {
  test("view Laporan tab in Keuangan page", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Keuangan" }).click();
    await page.getByRole("tab", { name: "Laporan" }).click();

    // Verify report section
    await expect(page.getByText("Ringkasan")).toBeVisible({ timeout: 5000 });
  });
});
