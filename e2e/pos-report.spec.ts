import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

async function login(request: any) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { username: "admin", password: "Admin123" },
  });
  expect(res.ok()).toBeTruthy();
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function createPosSale(request: any) {
  const productsRes = await request.get(`${BASE_URL}/api/products`);
  expect(productsRes.ok()).toBeTruthy();
  const products = await productsRes.json();
  const product = products[0];
  expect(product).toBeTruthy();

  const sale = await request.post(`${BASE_URL}/api/transactions`, {
    data: {
      type: "pos",
      items: [{ productId: product.id, quantity: 2 }],
      paymentMethod: "cash",
    },
  });
  expect(sale.ok()).toBeTruthy();
  return { product, transaction: await sale.json() };
}

test.describe("POS report", () => {
  test("returns POS summary with revenue, cogs, profit, payment methods, and products", async ({ request }) => {
    await login(request);
    const { product } = await createPosSale(request);
    const date = localDate();

    const res = await request.get(`${BASE_URL}/api/reports/pos?start=${date}&end=${date}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.summary.count).toBeGreaterThan(0);
    expect(body.summary.revenue).toBeGreaterThan(0);
    expect(body.summary.cogs).toBeGreaterThanOrEqual(0);
    expect(body.summary.profit).toBeDefined();
    expect(body.byPayment.some((row: any) => row.paymentMethod === "cash" && row.count > 0)).toBeTruthy();
    expect(body.products.some((row: any) => row.productName === product.name && row.qty >= 2)).toBeTruthy();
  });

  test("shows POS report panel on History POS tab", async ({ page, request }) => {
    await login(request);
    await createPosSale(request);

    await page.goto("/#history");
    await page.waitForLoadState("domcontentloaded");
    await page.click('button:has-text("POS")');
    await expect(page.getByRole("heading", { name: /laporan pos/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/Omzet|HPP|Profit|Produk Terlaris|Metode Pembayaran/i").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("CSV Produk")')).toBeVisible({ timeout: 5000 });
  });
});
