import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill("admin");
  await page.getByPlaceholder("Masukkan password").fill("Admin123");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Audit Log", () => {
  test("view audit log with filter chips", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Tentang & Log" }).click();

    // Verify audit log section
    await expect(page.getByText("Audit Log")).toBeVisible();

    // Verify filter chips
    await expect(page.getByRole("tab", { name: /Semua/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Info" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Warning/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Error/ })).toBeVisible();

    // Switch to Error filter
    await page.getByRole("tab", { name: /Error/ }).click();

    // Switch back to All
    await page.getByRole("tab", { name: /Semua/ }).click();
  });

  test("collapse and expand info section", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Pengaturan" }).click();
    await page.getByRole("tab", { name: "Tentang & Log" }).click();

    // Info section should be expanded by default
    await expect(page.getByText("Data tersimpan lokal")).toBeVisible();

    // Click to collapse
    await page.getByRole("button", { name: /Info Aplikasi/ }).click();

    // Info content should be hidden
    await expect(page.getByText("Data tersimpan lokal")).not.toBeVisible();

    // Click to expand again
    await page.getByRole("button", { name: /Info Aplikasi/ }).click();
    await expect(page.getByText("Data tersimpan lokal")).toBeVisible();
  });
});
