import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

test.describe("Login rate limiting", () => {
  test("locks out repeated failed login attempts", async ({ request }) => {
    const username = `missing-user-${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { username, password: "WrongPassword123" },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/salah/i);
    }

    const locked = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username, password: "WrongPassword123" },
    });

    expect(locked.status()).toBe(429);
    expect(locked.headers()["retry-after"]).toBeTruthy();
    const body = await locked.json();
    expect(body.error).toMatch(/terlalu banyak/i);
  });
});
