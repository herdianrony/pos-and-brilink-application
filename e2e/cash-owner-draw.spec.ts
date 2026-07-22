import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

async function login(request: any) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { username: "admin", password: "Admin123" },
  });
  expect(res.ok()).toBeTruthy();
}

async function getCashAccount(request: any) {
  const res = await request.get(`${BASE_URL}/api/accounts`);
  expect(res.ok()).toBeTruthy();
  const accounts = await res.json();
  const cash = accounts.find((a: any) => a.code === "cash");
  expect(cash).toBeTruthy();
  return cash;
}

test.describe("Owner draw / Ambil Profit", () => {
  test("records owner draw as balance mutation without changing transaction profit", async ({ request }) => {
    await login(request);
    let cash = await getCashAccount(request);

    if (Number(cash.balance) < 200_000) {
      const topup = await request.post(`${BASE_URL}/api/accounts`, {
        data: {
          action: "adjust",
          accountId: cash.id,
          amount: 300_000,
          type: "adjustment_in",
          notes: "E2E top up kas sebelum owner draw",
        },
      });
      expect(topup.ok()).toBeTruthy();
      cash = await getCashAccount(request);
    }

    const beforeBalance = Number(cash.balance);
    const beforeTxRes = await request.get(`${BASE_URL}/api/transactions?type=pos&limit=100`);
    const beforeTx = await beforeTxRes.json();
    const beforeProfit = beforeTx.reduce((sum: number, trx: any) => sum + Number(trx.profit || 0), 0);

    const drawRes = await request.post(`${BASE_URL}/api/accounts`, {
      data: {
        action: "adjust",
        accountId: cash.id,
        amount: -100_000,
        type: "owner_draw",
        notes: "E2E ambil profit owner",
      },
    });
    expect(drawRes.ok()).toBeTruthy();

    const afterCash = await getCashAccount(request);
    expect(Number(afterCash.balance)).toBe(beforeBalance - 100_000);

    const afterTxRes = await request.get(`${BASE_URL}/api/transactions?type=pos&limit=100`);
    const afterTx = await afterTxRes.json();
    const afterProfit = afterTx.reduce((sum: number, trx: any) => sum + Number(trx.profit || 0), 0);
    expect(afterProfit).toBe(beforeProfit);

    const mutationsRes = await request.get(`${BASE_URL}/api/accounts/mutations?limit=20`);
    const mutationsBody = await mutationsRes.json();
    const mutations = mutationsBody.mutations || mutationsBody;
    expect(mutations.some((m: any) => m.type === "owner_draw" && Number(m.amount) === -100_000)).toBeTruthy();
  });

  test("rejects owner draw when balance is insufficient", async ({ request }) => {
    await login(request);
    const cash = await getCashAccount(request);
    const tooMuch = Number(cash.balance) + 999_999;

    const res = await request.post(`${BASE_URL}/api/accounts`, {
      data: {
        action: "adjust",
        accountId: cash.id,
        amount: -tooMuch,
        type: "owner_draw",
        notes: "E2E owner draw over balance",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INSUFFICIENT_BALANCE");
  });

  test("shows Ambil Profit button and modal on cash page", async ({ page }) => {
    await page.goto("/#cash");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('button:has-text("Ambil Profit")').first()).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Ambil Profit")').first().click();
    await expect(page.getByRole("heading", { name: /ambil profit owner/i })).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/Prive|penarikan laba/i").first()).toBeVisible({ timeout: 5000 });
  });
});
