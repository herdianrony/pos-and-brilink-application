import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Sequential — share server state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker — tests share DB state
  reporter: "list",
  timeout: 30000,
  expect: { timeout: 10000 },
  // F-06: globalSetup resets DB, creates admin, seeds data, saves auth state
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    // F-06: All tests start authenticated (except auth.spec.ts which clears cookies)
    storageState: ".playwright-auth.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "PORT=3001 npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
