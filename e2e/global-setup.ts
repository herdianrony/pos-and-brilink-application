/**
 * Playwright globalSetup — F-06
 *
 * Runs ONCE before any test. Responsibilities:
 *   1. Delete the test DB file to ensure a clean state.
 *   2. Wait for the Next.js dev server to be ready.
 *   3. Call /api/auth/setup to create the admin user (admin/Admin123).
 *   4. Call /api/seed to populate products, services, accounts.
 *   5. Log in via /api/auth/login and save the session cookie to
 *      .playwright-auth.json so all tests start already authenticated.
 *
 * This makes the suite deterministic regardless of prior runs.
 */
import { chromium, type FullConfig } from "@playwright/test";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import path from "path";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3001";
const DB_PATH = path.resolve(process.cwd(), "data.db");
const AUTH_FILE = path.resolve(process.cwd(), ".playwright-auth.json");

async function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready at ${url} within ${timeoutMs}ms`);
}

async function globalSetup(config: FullConfig) {
  // 1. Clean DB file
  if (existsSync(DB_PATH)) {
    try { unlinkSync(DB_PATH); } catch { /* ignore */ }
  }
  // Also clean -wal and -shm files
  for (const ext of ["-wal", "-shm"]) {
    const p = DB_PATH + ext;
    if (existsSync(p)) {
      try { unlinkSync(p); } catch { /* ignore */ }
    }
  }
  // Ensure auth dir exists
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // 2. Wait for server
  await waitForServer(BASE_URL);

  // 3. Setup admin user
  const setupRes = await fetch(`${BASE_URL}/api/auth/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Admin Test",
      username: "admin",
      password: "Admin123",
      role: "admin",
    }),
  });
  if (!setupRes.ok) {
    const txt = await setupRes.text();
    // If setup already done (409), that's fine — admin already exists
    if (setupRes.status !== 409) {
      throw new Error(`Setup failed: ${setupRes.status} ${txt}`);
    }
  }

  // 4. Seed data
  // We need to be authenticated for seed in production; in dev mode, seed is open.
  // Get auth cookie first by logging in.
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "Admin123" }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status}`);
  }
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/brilink_pos_session=([^;]+)/);
  if (!cookieMatch) {
    throw new Error("Session cookie not found in login response");
  }
  const sessionCookie = cookieMatch[1];

  // Now seed with auth cookie (system templates only)
  const seedRes = await fetch(`${BASE_URL}/api/seed`, {
    method: "POST",
    headers: {
      "Cookie": `brilink_pos_session=${sessionCookie}`,
    },
  });
  if (!seedRes.ok) {
    const txt = await seedRes.text();
    throw new Error(`Seed failed: ${seedRes.status} ${txt}`);
  }

  // 4b. Create demo data (products + fee tiers) for E2E tests
  //     This is separate from production seed — only for testing.
  const demoRes = await fetch(`${BASE_URL}/api/seed-demo`, {
    method: "POST",
    headers: {
      "Cookie": `brilink_pos_session=${sessionCookie}`,
    },
  });
  if (!demoRes.ok) {
    const txt = await demoRes.text();
    throw new Error(`Demo seed failed: ${demoRes.status} ${txt}`);
  }

  // 5. Save auth state for tests
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "brilink_pos_session",
      value: sessionCookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await context.storageState({ path: AUTH_FILE });
  await browser.close();

  console.log("[globalSetup] DB reset, admin user created, data seeded, auth state saved.");
}

export default globalSetup;
