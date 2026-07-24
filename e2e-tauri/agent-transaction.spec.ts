import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Agent Transaction — Transfer", () => {
  test("complete agent transfer transaction flow", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Layanan Agen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Layanan Agen" }).first()).toBeVisible({ timeout: 5000 });

    // Step 1: Select Transfer preset
    await page.getByRole("button", { name: /Transfer/ }).first().click();

    // Fill form fields
    const amountInput = page.getByPlaceholder("Rp0").nth(0);
    await amountInput.fill("500000");

    const feeInput = page.getByPlaceholder("Rp0").nth(1);
    await feeInput.fill("5000");

    // Move to Review
    await page.getByRole("button", { name: /Lanjut ke Review/ }).click();

    // Step 2: Verify review
    await expect(page.getByText("Review detail transaksi")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Rp500.000")).toBeVisible();
    await expect(page.getByText("Rp5.000")).toBeVisible();

    // Move to Confirm
    await page.getByRole("button", { name: /Konfirmasi Transaksi/ }).first().click();

    // Step 3: Final confirmation
    await expect(page.getByText("Konfirmasi Transaksi")).toBeVisible({ timeout: 5000 });

    // Submit
    await page.getByRole("button", { name: /Konfirmasi Transaksi/ }).last().click();

    // Verify success (should return to step 1 or show success)
    await expect(page.getByText("berhasil|tersimpan|Layanan Agen")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Agent Transaction — Tarik Tunai", () => {
  test("complete tarik tunai flow", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Layanan Agen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Layanan Agen" }).first()).toBeVisible({ timeout: 5000 });

    // Select Tarik Tunai
    await page.getByRole("button", { name: /Tarik Tunai/ }).first().click();

    // Fill amount
    await page.getByPlaceholder("Rp0").nth(0).fill("1000000");

    // Move to Review
    await page.getByRole("button", { name: /Lanjut ke Review/ }).click();
    await expect(page.getByText("Rp1.000.000")).toBeVisible({ timeout: 5000 });
  });
});
