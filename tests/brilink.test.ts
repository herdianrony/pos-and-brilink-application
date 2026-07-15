import { describe, it, expect } from "vitest";
import { calculateAgentProfit, calculateServiceFee, calculateTotalWithAdminFee } from "@/lib/service-fees";

// ── BRILink Business Logic Tests ─────────────────
// Test fee calculation, tier lookup, transaction effects

interface FeeTier {
  minAmount: number;
  maxAmount: number | null;
  adminFee: number;
  agentFee: number;
}

interface Service {
  id: number;
  name: string;
  adminFee: number;
  agentFee: number;
  useTieredFee: boolean;
  cashEffect: "in" | "out" | "none";
  bankEffect: "in" | "out" | "none";
}

// ── Fee Tier Lookup ──────────────────────────────
function findTier(tiers: FeeTier[], amount: number): FeeTier | null {
  for (const tier of tiers) {
    const min = tier.minAmount;
    const max = tier.maxAmount;
    if (amount >= min && (max === null || amount <= max)) {
      return tier;
    }
  }
  return null;
}

// ── Calculate Fee ────────────────────────────────
function calculateFee(service: Service, tiers: FeeTier[], amount: number): { adminFee: number; agentFee: number } {
  const calculated = calculateServiceFee(amount, {
    adminFee: String(service.adminFee),
    agentFee: String(service.agentFee),
    useTieredFee: service.useTieredFee,
    feeTiers: tiers.map((tier) => ({
      minAmount: String(tier.minAmount),
      maxAmount: tier.maxAmount === null ? null : String(tier.maxAmount),
      adminFee: String(tier.adminFee),
      agentFee: String(tier.agentFee),
    })),
  });
  return { adminFee: calculated.adminFee, agentFee: calculated.agentFee };
}

// ── Calculate Profit ─────────────────────────────
function calculateProfit(service: Service, amount: number, fee: { adminFee: number; agentFee: number }): number {
  // Profit = agentFee (untuk layanan agen)
  // Untuk POS, profit = margin (sellPrice - buyPrice) — tidak di-test di sini
  return calculateAgentProfit(fee.agentFee);
}

// ── Calculate Total Amount ───────────────────────
function calculateTotalAmount(amount: number, adminFee: number): number {
  return calculateTotalWithAdminFee(amount, adminFee);
}

// ── Account Effect ───────────────────────────────
function getAccountEffects(service: Service): { cashDelta: number; bankDelta: number } {
  // cashEffect: 'in' = kas bertambah, 'out' = kas berkurang
  // bankEffect: 'in' = rekening bertambah, 'out' = rekening berkurang
  return {
    cashDelta: service.cashEffect === "in" ? 1 : service.cashEffect === "out" ? -1 : 0,
    bankDelta: service.bankEffect === "in" ? 1 : service.bankEffect === "out" ? -1 : 0,
  };
}

// ── Mock Data ────────────────────────────────────
const transferTiers: FeeTier[] = [
  { minAmount: 0, maxAmount: 10000000, adminFee: 2500, agentFee: 2500 },
  { minAmount: 10000001, maxAmount: 50000000, adminFee: 5000, agentFee: 5000 },
  { minAmount: 50000001, maxAmount: null, adminFee: 10000, agentFee: 10000 },
];

const tarikTunaiTiers: FeeTier[] = [
  { minAmount: 0, maxAmount: 1000000, adminFee: 2500, agentFee: 2500 },
  { minAmount: 1000001, maxAmount: 5000000, adminFee: 3500, agentFee: 3500 },
  { minAmount: 5000001, maxAmount: null, adminFee: 5000, agentFee: 5000 },
];

const tokenPlnTiers: FeeTier[] = [
  { minAmount: 20000, maxAmount: 20000, adminFee: 1500, agentFee: 1500 },
  { minAmount: 50000, maxAmount: 50000, adminFee: 1500, agentFee: 1500 },
  { minAmount: 100000, maxAmount: 100000, adminFee: 2000, agentFee: 2000 },
  { minAmount: 200000, maxAmount: 200000, adminFee: 2000, agentFee: 2000 },
  { minAmount: 500000, maxAmount: 500000, adminFee: 3000, agentFee: 3000 },
  { minAmount: 1000000, maxAmount: 1000000, adminFee: 5000, agentFee: 5000 },
];

const voucherGameTiers: FeeTier[] = [
  { minAmount: 12000, maxAmount: 12000, adminFee: 1000, agentFee: 1000 },
  { minAmount: 33000, maxAmount: 33000, adminFee: 1500, agentFee: 1500 },
  { minAmount: 66000, maxAmount: 66000, adminFee: 2000, agentFee: 2000 },
  { minAmount: 132000, maxAmount: 132000, adminFee: 2500, agentFee: 2500 },
  { minAmount: 330000, maxAmount: 330000, adminFee: 3000, agentFee: 3000 },
  { minAmount: 600000, maxAmount: 600000, adminFee: 5000, agentFee: 5000 },
];

// ── Tests ────────────────────────────────────────

describe("Fee Tier: findTier", () => {
  it("should find correct tier for amount within range", () => {
    const tier = findTier(transferTiers, 5000000);
    expect(tier?.adminFee).toBe(2500);
  });

  it("should find tier for amount at boundary", () => {
    const tier = findTier(transferTiers, 10000000);
    expect(tier?.adminFee).toBe(2500);
  });

  it("should find tier for amount above first boundary", () => {
    const tier = findTier(transferTiers, 15000000);
    expect(tier?.adminFee).toBe(5000);
  });

  it("should find tier for very large amount", () => {
    const tier = findTier(transferTiers, 100000000);
    expect(tier?.adminFee).toBe(10000);
  });

  it("should return null for amount not matching any tier", () => {
    const tier = findTier(tokenPlnTiers, 35000); // not a valid Token PLN nominal
    expect(tier).toBeNull();
  });
});

describe("Fee Calculation: Transfer Antar Bank", () => {
  const service: Service = {
    id: 1,
    name: "Transfer Antar Bank (RTGS)",
    adminFee: 2500,
    agentFee: 2500,
    useTieredFee: false,
    cashEffect: "out",
    bankEffect: "in",
  };

  it("should use flat fee when not tiered", () => {
    const fee = calculateFee(service, [], 5000000);
    expect(fee.adminFee).toBe(2500);
    expect(fee.agentFee).toBe(2500);
  });

  it("should use tiered fee when enabled", () => {
    const tieredService = { ...service, useTieredFee: true };
    const fee = calculateFee(tieredService, transferTiers, 5000000);
    expect(fee.adminFee).toBe(2500);
    expect(fee.agentFee).toBe(2500);
  });

  it("should use higher tier for large amount", () => {
    const tieredService = { ...service, useTieredFee: true };
    const fee = calculateFee(tieredService, transferTiers, 20000000);
    expect(fee.adminFee).toBe(5000);
  });
});

describe("Fee Calculation: Tarik Tunai", () => {
  const service: Service = {
    id: 2,
    name: "Tarik Tunai Bank",
    adminFee: 2500,
    agentFee: 2500,
    useTieredFee: true,
    cashEffect: "out",
    bankEffect: "none",
  };

  it("should return 2500 for amount ≤ 1Jt", () => {
    const fee = calculateFee(service, tarikTunaiTiers, 500000);
    expect(fee.adminFee).toBe(2500);
  });

  it("should return 3500 for amount 1Jt-5Jt", () => {
    const fee = calculateFee(service, tarikTunaiTiers, 3000000);
    expect(fee.adminFee).toBe(3500);
  });

  it("should return 5000 for amount > 5Jt", () => {
    const fee = calculateFee(service, tarikTunaiTiers, 10000000);
    expect(fee.adminFee).toBe(5000);
  });
});

describe("Fee Calculation: Token PLN", () => {
  const service: Service = {
    id: 3,
    name: "Token PLN",
    adminFee: 1500,
    agentFee: 1500,
    useTieredFee: true,
    cashEffect: "in",
    bankEffect: "out",
  };

  it("should return 1500 for 20K token", () => {
    const fee = calculateFee(service, tokenPlnTiers, 20000);
    expect(fee.adminFee).toBe(1500);
  });

  it("should return 2000 for 100K token", () => {
    const fee = calculateFee(service, tokenPlnTiers, 100000);
    expect(fee.adminFee).toBe(2000);
  });

  it("should return 5000 for 1Jt token", () => {
    const fee = calculateFee(service, tokenPlnTiers, 1000000);
    expect(fee.adminFee).toBe(5000);
  });

  it("should fallback to flat fee for invalid nominal", () => {
    const fee = calculateFee(service, tokenPlnTiers, 35000);
    expect(fee.adminFee).toBe(1500); // flat fee fallback
  });
});

describe("Fee Calculation: Voucher Game", () => {
  const service: Service = {
    id: 4,
    name: "Voucher Game",
    adminFee: 1000,
    agentFee: 1000,
    useTieredFee: true,
    cashEffect: "in",
    bankEffect: "out",
  };

  it("should return 1000 for 12K voucher", () => {
    const fee = calculateFee(service, voucherGameTiers, 12000);
    expect(fee.adminFee).toBe(1000);
  });

  it("should return 2500 for 132K voucher", () => {
    const fee = calculateFee(service, voucherGameTiers, 132000);
    expect(fee.adminFee).toBe(2500);
  });

  it("should return 5000 for 600K voucher", () => {
    const fee = calculateFee(service, voucherGameTiers, 600000);
    expect(fee.adminFee).toBe(5000);
  });
});

describe("Transaction: calculateTotalAmount", () => {
  it("should add admin fee to amount", () => {
    expect(calculateTotalAmount(500000, 2500)).toBe(502500);
  });

  it("should handle zero fee", () => {
    expect(calculateTotalAmount(500000, 0)).toBe(500000);
  });
});

describe("Transaction: calculateProfit", () => {
  it("should return agentFee as profit", () => {
    const service: Service = { id: 1, name: "Test", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out" };
    const fee = { adminFee: 2500, agentFee: 2500 };
    expect(calculateProfit(service, 500000, fee)).toBe(2500);
  });
});

describe("Transaction: getAccountEffects", () => {
  it("should return positive cash delta for 'in' effect", () => {
    const service: Service = { id: 1, name: "Setor", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out" };
    const effects = getAccountEffects(service);
    expect(effects.cashDelta).toBe(1); // kas bertambah
    expect(effects.bankDelta).toBe(-1); // bank berkurang
  });

  it("should return negative cash delta for 'out' effect", () => {
    const service: Service = { id: 2, name: "Tarik", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "out", bankEffect: "none" };
    const effects = getAccountEffects(service);
    expect(effects.cashDelta).toBe(-1); // kas berkurang
    expect(effects.bankDelta).toBe(0); // bank tidak terpengaruh
  });

  it("should return zero deltas for 'none' effect", () => {
    const service: Service = { id: 3, name: "Cek Saldo", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "none", bankEffect: "none" };
    const effects = getAccountEffects(service);
    expect(effects.cashDelta).toBe(0);
    expect(effects.bankDelta).toBe(0);
  });

  it("should handle transfer (cash out, bank in)", () => {
    const service: Service = { id: 4, name: "Transfer", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "out", bankEffect: "in" };
    const effects = getAccountEffects(service);
    expect(effects.cashDelta).toBe(-1); // kas keluar
    expect(effects.bankDelta).toBe(1); // bank masuk
  });
});
