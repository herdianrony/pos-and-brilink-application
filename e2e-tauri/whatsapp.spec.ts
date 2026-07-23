import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("WhatsApp Management", () => {
  test("navigate to Settings > WhatsApp and verify status", async ({ page }) => {
    await login(page);

    // Go to Settings > WhatsApp
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "WhatsApp" }).click();

    // Verify WhatsApp management UI
    await expect(page.getByText("Status WhatsApp")).toBeVisible();
    await expect(page.getByText("Tentang Fitur WhatsApp")).toBeVisible();

    // Verify action button exists
    await expect(page.getByRole("button", { name: /Mulai WhatsApp|Restart|Refresh Status/ }).first()).toBeVisible();
  });
});
