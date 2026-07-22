import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3001";

async function login(request: any) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { username: "admin", password: "Admin123" },
  });
  expect(res.ok()).toBeTruthy();
}

async function getAccounts(request: any) {
  const res = await request.get(`${BASE_URL}/api/accounts`);
  expect(res.ok()).toBeTruthy();
  return await res.json();
}

test.describe("History lifecycle: reverse Tarik Tunai", () => {
  test("creates Tarik Tunai, verifies ledger impact, then reverses it", async ({ request }) => {
    await login(request);

    let accounts = await getAccounts(request);
    const cash = accounts.find((account: any) => account.code === "cash");
    const bank = accounts.find((account: any) => account.code === "bank_bri") || accounts.find((account: any) => account.code !== "cash");
    expect(cash).toBeTruthy();
    expect(bank).toBeTruthy();

    // Ensure account is active and has enough balances for deterministic test.
    await request.post(`${BASE_URL}/api/accounts`, {
      data: {
        action: "update",
        id: bank.id,
        name: bank.name,
        icon: bank.icon || "landmark",
        color: bank.color || "#00529B",
        minBalance: bank.minBalance || "0",
        isActive: true,
      },
    });
    await request.post(`${BASE_URL}/api/accounts`, {
      data: { action: "adjust", accountId: cash.id, amount: 500000, notes: "E2E opening cash" },
    });
    await request.post(`${BASE_URL}/api/accounts`, {
      data: { action: "adjust", accountId: bank.id, amount: 500000, notes: "E2E opening bank" },
    });

    accounts = await getAccounts(request);
    const cashBefore = Number(accounts.find((account: any) => account.id === cash.id).balance);
    const bankBefore = Number(accounts.find((account: any) => account.id === bank.id).balance);

    const servicesRes = await request.get(`${BASE_URL}/api/brilink-services`);
    expect(servicesRes.ok()).toBeTruthy();
    const services = await servicesRes.json();
    const tarikTunai = services.find((service: any) => service.code === "cash_withdrawal" || service.name.includes("Tarik Tunai"));
    expect(tarikTunai).toBeTruthy();

    // Align service with production Tarik Tunai scenario:
    // customer transfers nominal + fee to agent bank; agent gives nominal cash.
    const updateService = await request.put(`${BASE_URL}/api/brilink-services`, {
      data: {
        id: tarikTunai.id,
        name: tarikTunai.name,
        categoryId: tarikTunai.categoryId,
        categoryCode: tarikTunai.categoryCode,
        icon: tarikTunai.icon || "banknote",
        adminFee: "5000",
        agentFee: "5000",
        useTieredFee: false,
        cashEffect: "out",
        bankEffect: "in",
        flowType: "cash_withdrawal",
        defaultFeeMethod: "charged",
        description: tarikTunai.description || null,
      },
    });
    expect(updateService.ok()).toBeTruthy();

    const createRes = await request.post(`${BASE_URL}/api/transactions`, {
      data: {
        type: "brilink",
        serviceId: tarikTunai.id,
        subType: "Tarik Tunai E2E",
        totalAmount: 100000,
        feeMethod: "charged",
        bankAccountId: bank.id,
        paymentMethod: "transfer",
        cashConfirmed: true,
        referenceNo: `E2E-TARIK-${Date.now()}`,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const trx = await createRes.json();
    expect(trx.status).toBe("completed");
    expect(Number(trx.profit)).toBe(5000);

    accounts = await getAccounts(request);
    const cashAfterCreate = Number(accounts.find((account: any) => account.id === cash.id).balance);
    const bankAfterCreate = Number(accounts.find((account: any) => account.id === bank.id).balance);
    expect(cashAfterCreate).toBe(cashBefore - 100000);
    expect(bankAfterCreate).toBe(bankBefore + 105000);

    const reverseRes = await request.patch(`${BASE_URL}/api/transactions/${trx.id}`, {
      data: { action: "reverse", reason: "E2E provider reversal" },
    });
    expect(reverseRes.ok()).toBeTruthy();
    const reversed = await reverseRes.json();
    expect(reversed.status).toBe("reversed");

    accounts = await getAccounts(request);
    const cashAfterReverse = Number(accounts.find((account: any) => account.id === cash.id).balance);
    const bankAfterReverse = Number(accounts.find((account: any) => account.id === bank.id).balance);
    expect(cashAfterReverse).toBe(cashBefore);
    expect(bankAfterReverse).toBe(bankBefore);
  });
});
