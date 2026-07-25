import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("WhatsApp Flow", () => {
  test("view WhatsApp status and info cards", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "WhatsApp" }).click();

    // Verify status card
    await expect(page.getByText("Status WhatsApp")).toBeVisible();

    // Verify info card
    await expect(page.getByText("Tentang Fitur WhatsApp")).toBeVisible();
    await expect(page.getByText("notifikasi otomatis")).toBeVisible();
  });

  test("verify WhatsApp action buttons", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "WhatsApp" }).click();

    // Should have at least one action button
    const startButton = page.getByRole("button", { name: /Mulai WhatsApp/ });
    const refreshButton = page.getByRole("button", { name: /Refresh Status/ });
    await expect(startButton.or(refreshButton).first()).toBeVisible({ timeout: 5000 });
  });
});
