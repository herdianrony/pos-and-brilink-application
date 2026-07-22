import { test, expect } from "@playwright/test";

// ── E2E: Financial Regression Tests (F-01, F-02) ──
// Tests the security fixes from the F-audit:
//   F-01: Server-side discount policy (cashier cannot give 100% discount without admin PIN)
//   F-02: BRILink cannot create negative cash/bank balance

const BASE_URL = "http://localhost:3001";

test.describe("F-01: Discount policy", () => {
  test("should reject 100% discount without admin PIN", async ({ request }) => {
    // Get auth cookie first
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: "admin", password: "Admin123" },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Find a product to use
    const productsRes = await request.get(`${BASE_URL}/api/products`);
    expect(productsRes.ok()).toBeTruthy();
    const products = await productsRes.json();
    expect(products.length).toBeGreaterThan(0);
    const product = products[0];

    // Try 100% discount without PIN — should fail
    const res = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "pos",
        items: [{ productId: product.id, quantity: 1 }],
        discount: Number(product.sellPrice), // 100% discount
        paymentMethod: "cash",
      },
    });
    // Should reject with 403 (PIN required) or 400 (reason required)
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("should accept discount within policy with reason", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: "admin", password: "Admin123" },
    });

    const productsRes = await request.get(`${BASE_URL}/api/products`);
    const products = await productsRes.json();
    const product = products[0];
    const sellPrice = Number(product.sellPrice);

    // Use quantity 2 so total is Rp7000; discount Rp500 = 7.1% (within 10% policy)
    const qty = 2;
    const totalAmount = sellPrice * qty;
    const discount = 500;
    const percentOfTotal = (discount / totalAmount) * 100;
    // Sanity check: discount must be within policy
    expect(percentOfTotal).toBeLessThanOrEqual(10);

    const res = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "pos",
        items: [{ productId: product.id, quantity: qty }],
        discount,
        discountReason: "Pelanggan repeat order",
        paymentMethod: "cash",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.totalAmount).toBe(totalAmount - discount);
    // Profit should be finalTotal - (buyPrice * qty) (NOT sellPrice - buyPrice)
    expect(body.profit).toBe(totalAmount - discount - Number(product.buyPrice) * qty);
  });

  test("should reject discount without reason", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: "admin", password: "Admin123" },
    });

    const productsRes = await request.get(`${BASE_URL}/api/products`);
    const products = await productsRes.json();
    const product = products[0];
    const sellPrice = Number(product.sellPrice);

    // Use quantity 2 so discount Rp500 = 7.1% (within 10% policy, but no reason)
    const qty = 2;
    const totalAmount = sellPrice * qty;
    const discount = 500;

    const res = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "pos",
        items: [{ productId: product.id, quantity: qty }],
        discount,
        // No discountReason
        paymentMethod: "cash",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("DISCOUNT_REASON_REQUIRED");
  });
});

test.describe("F-02: Insufficient balance protection", () => {
  test("should reject BRILink Tarik Tunai if cash balance insufficient", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: "admin", password: "Admin123" },
    });

    // Get services list
    const svcRes = await request.get(`${BASE_URL}/api/brilink-services`);
    expect(svcRes.ok()).toBeTruthy();
    const services = await svcRes.json();
    const tarikService = services.find((s: any) =>
      s.name.includes("Tarik Tunai") && s.cashEffect === "out"
    );
    expect(tarikService).toBeTruthy();

    // Try to withdraw 1 billion — way more than any cash balance
    const res = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "brilink",
        serviceId: tarikService.id,
        totalAmount: 1_000_000_000, // 1 billion
        paymentMethod: "cash",
        cashConfirmed: true,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INSUFFICIENT_CASH");
    expect(body.error).toMatch(/saldo kas tidak cukup/i);
  });

  test("should reject BRILink Setor Tunai if bank balance insufficient", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: "admin", password: "Admin123" },
    });

    const svcRes = await request.get(`${BASE_URL}/api/brilink-services`);
    const services = await svcRes.json();
    const setorService = services.find((s: any) =>
      s.name.includes("Setor Tunai") && s.bankEffect === "out"
    );
    expect(setorService).toBeTruthy();

    // Bank balance starts at Rp2.000.000 in seed. Try to setor 1 billion.
    const res = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "brilink",
        serviceId: setorService.id,
        totalAmount: 1_000_000_000,
        paymentMethod: "cash",
        cashConfirmed: true,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    // Should fail with either insufficient bank or cash balance
    expect(body.code).toMatch(/INSUFFICIENT_/);
  });
});

test.describe("F-04: Atomic seed recovery", () => {
  test("should be idempotent — running seed twice does not error", async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: "admin", password: "Admin123" },
    });

    const res1 = await request.post(`${BASE_URL}/api/seed`);
    expect(res1.ok()).toBeTruthy();
    const res2 = await request.post(`${BASE_URL}/api/seed`);
    expect(res2.ok()).toBeTruthy();
    const body2 = await res2.json();
    // Second call should report already seeded
    expect(body2.message).toMatch(/already seeded|seed data created/i);
  });
});
