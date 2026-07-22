import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

async function login(request: any) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { username: "admin", password: "Admin123" },
  });
  expect(res.ok()).toBeTruthy();
}

async function getAccounts(request: any) {
  const res = await request.get(`${BASE_URL}/api/accounts`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function firstProduct(request: any) {
  const res = await request.get(`${BASE_URL}/api/products`);
  expect(res.ok()).toBeTruthy();
  const products = await res.json();
  expect(products.length).toBeGreaterThan(0);
  return products[0];
}

test.describe("POS non-cash settlement", () => {
  test("settles POS transfer payment into selected bank account, not cash", async ({ request }) => {
    await login(request);
    const accountsBefore = await getAccounts(request);
    const cashBefore = accountsBefore.find((a: any) => a.code === "cash");
    const bankBefore = accountsBefore.find((a: any) => a.code === "bank_bri");
    expect(cashBefore).toBeTruthy();
    expect(bankBefore).toBeTruthy();
    expect(bankBefore.isActive).toBeTruthy();

    const product = await firstProduct(request);
    const amount = Number(product.sellPrice);

    const trxRes = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "pos",
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: "transfer",
        settlementAccountId: bankBefore.id,
        referenceNo: `E2E-TRF-${Date.now()}`,
      },
    });
    expect(trxRes.ok()).toBeTruthy();
    const trx = await trxRes.json();
    expect(trx.paymentMethod).toBe("transfer");

    const accountsAfter = await getAccounts(request);
    const cashAfter = accountsAfter.find((a: any) => a.id === cashBefore.id);
    const bankAfter = accountsAfter.find((a: any) => a.id === bankBefore.id);
    expect(Number(cashAfter.balance)).toBe(Number(cashBefore.balance));
    expect(Number(bankAfter.balance)).toBe(Number(bankBefore.balance) + amount);

    const mutationsRes = await request.get(`${BASE_URL}/api/accounts/mutations?limit=20`);
    const mutationsBody = await mutationsRes.json();
    const mutations = mutationsBody.mutations || mutationsBody;
    expect(mutations.some((m: any) => m.referenceId === trx.id && m.type === "pos_transfer_in")).toBeTruthy();
  });

  test("settles POS QRIS payment into selected QRIS/e-wallet account", async ({ request }) => {
    await login(request);
    const createRes = await request.post(`${BASE_URL}/api/accounts`, {
      data: {
        action: "create",
        name: `QRIS E2E ${Date.now()}`,
        icon: "smartphone",
        color: "#00875A",
        balance: 0,
        minBalance: 0,
        isActive: true,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const qrisAccount = await createRes.json();

    const product = await firstProduct(request);
    const amount = Number(product.sellPrice);

    const trxRes = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "pos",
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: "qris",
        settlementAccountId: qrisAccount.id,
        referenceNo: `E2E-QRIS-${Date.now()}`,
      },
    });
    expect(trxRes.ok()).toBeTruthy();
    const trx = await trxRes.json();
    expect(trx.paymentMethod).toBe("qris");

    const accountsAfter = await getAccounts(request);
    const qrisAfter = accountsAfter.find((a: any) => a.id === qrisAccount.id);
    expect(Number(qrisAfter.balance)).toBe(amount);

    const mutationsRes = await request.get(`${BASE_URL}/api/accounts/mutations?limit=20`);
    const mutationsBody = await mutationsRes.json();
    const mutations = mutationsBody.mutations || mutationsBody;
    expect(mutations.some((m: any) => m.referenceId === trx.id && m.type === "pos_qris_in")).toBeTruthy();
  });

  test("shows receiving account selector in POS payment modal for transfer/QRIS", async ({ page }) => {
    await page.goto("/#pos");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector('h2:has-text("Kasir POS")', { timeout: 10000 });
    const firstProductButton = page.locator('button:has-text("Rp")').first();
    await expect(firstProductButton).toBeVisible({ timeout: 10000 });
    await firstProductButton.click();
    await page.locator('button:has-text("Bayar")').click();
    await page.locator('button:has-text("Transfer")').click();
    await expect(page.locator("label:has-text('Rekening Penerima')")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("select").filter({ hasText: /BRI|BCA|DANA|QRIS|M-Banking/i }).first()).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("QRIS")').click();
    await expect(page.locator("label:has-text('Rekening Penerima')")).toBeVisible({ timeout: 5000 });
  });
});
