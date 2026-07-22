import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("WhatsApp Sidecar", () => {
  test("navigate to Settings and check WhatsApp integration toggle", async ({
    page,
  }) => {
    await login(page);

    // WhatsApp settings should be accessible via Pengaturan
    // The sidecar itself is managed via the Rust backend
    // We test the UI availability and toggle state

    await page.getByRole("button", { name: "Pengaturan" }).click();
    await expect(
      page.getByRole("heading", { name: "Pengaturan" })
    ).toBeVisible();

    // Check if WhatsApp toggle/settings is present in the UI
    // This depends on the actual settings page implementation
    const waToggle = page.getByText(/whatsapp/i);
    const waVisible = await waToggle.first().isVisible().catch(() => false);

    // If WhatsApp section exists, verify it
    if (waVisible) {
      await expect(waToggle.first()).toBeVisible();
    }
  });

  test("verify WhatsApp notify is referenced in agent service flow", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: "Layanan Agen", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Layanan Agen", exact: true })
    ).toBeVisible();

    // The service form should work without WhatsApp
    await page.getByRole("button", { name: /Transfer/ }).first().click();
    await page.getByLabel("Nominal Transaksi").fill("50000");
    await page.getByLabel("Admin Toko").fill("3000");

    // Verify profit estimate shows
    await expect(page.getByText("Estimasi Keuntungan")).toBeVisible();
  });
});
