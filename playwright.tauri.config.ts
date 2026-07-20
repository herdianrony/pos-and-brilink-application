import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-tauri",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx cross-env VITE_TAURI_UI_E2E=1 npm run dev:tauri-ui",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
