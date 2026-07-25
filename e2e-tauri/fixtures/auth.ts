import { expect, test as base } from "@playwright/test";

/**
 * Shared login fixture for all E2E tests.
 * Usage: import { test, login } from "../fixtures/auth";
 */
export const test = base.extend<{ loggedIn: void }>({
  loggedIn: [async ({ page }, use) => {
    await page.goto("/");
    await page.getByPlaceholder("Masukkan username").fill("admin");
    await page.getByPlaceholder("Masukkan password").fill("Admin123");
    await page.getByRole("button", { name: /masuk/i }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await use();
  }, { auto: true }],
});

export { expect } from "@playwright/test";

/** Manual login helper for tests that need custom login flow */
export async function login(page: import("@playwright/test").Page, username = "admin", password = "Admin123") {
  await page.goto("/");
  await page.getByPlaceholder("Masukkan username").fill(username);
  await page.getByPlaceholder("Masukkan password").fill(password);
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
