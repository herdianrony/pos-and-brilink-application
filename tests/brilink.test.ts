import { describe, it, expect } from "vitest";
import type { AgentService, FeeTier } from "@/types/models";
import { calculateAgentProfit, calculateServiceFee, calculateTotalWithAdminFee } from "@/lib/service-fees";
import { calculateCashFlow, calculateBankFlow } from "@/lib/service-flow";

function tier(minAmount: number, maxAmount: number | null, adminFee: number, agentFee: number): FeeTier {
  return {
    minAmount: String(minAmount),
    maxAmount: maxAmount === null ? null : String(maxAmount),
    adminFee: String(adminFee),
    agentFee: String(agentFee),
  };
}

function service(overrides: Partial<AgentService> = {}): AgentService {
  return {
    id: 1,
    name: "Layanan Test",
    categoryId: null,
    categoryName: null,
    icon: null,
    adminFee: "2500",
    agentFee: "2500",
    useTieredFee: false,
    feeTiers: [],
    cashEffect: "in",
    bankEffect: "out",
    description: null,
    ...overrides,
  };
}

const transferTiers: FeeTier[] = [
  tier(0, 10000000, 2500, 2500),
  tier(10000001, 50000000, 5000, 5000),
  tier(50000001, null, 10000, 10000),
];

const tarikTunaiTiers: FeeTier[] = [
  tier(0, 1000000, 2500, 2500),
  tier(1000001, 5000000, 3500, 3500),
  tier(5000001, null, 5000, 5000),
];

const tokenPlnTiers: FeeTier[] = [
  tier(20000, 20000, 1500, 1500),
  tier(50000, 50000, 1500, 1500),
  tier(100000, 100000, 2000, 2000),
  tier(200000, 200000, 2000, 2000),
  tier(500000, 500000, 3000, 3000),
  tier(1000000, 1000000, 5000, 5000),
];

describe("Service fee calculation", () => {
  it("uses flat fee when tiered fee is disabled", () => {
    const fee = calculateServiceFee(5000000, service({ useTieredFee: false, feeTiers: transferTiers }));
    expect(fee.adminFee).toBe(2500);
    expect(fee.agentFee).toBe(2500);
    expect(fee.tier).toBeNull();
  });

  it("uses first matching tier when tiered fee is enabled", () => {
    const fee = calculateServiceFee(20000000, service({ useTieredFee: true, feeTiers: transferTiers }));
    expect(fee.adminFee).toBe(5000);
    expect(fee.agentFee).toBe(5000);
    expect(fee.tier?.minAmount).toBe("10000001");
  });

  it("uses open-ended tier for very large amount", () => {
    const fee = calculateServiceFee(100000000, service({ useTieredFee: true, feeTiers: transferTiers }));
    expect(fee.adminFee).toBe(10000);
  });

  it("falls back to flat fee when nominal does not match exact tier", () => {
    const fee = calculateServiceFee(35000, service({ adminFee: "1500", agentFee: "1500", useTieredFee: true, feeTiers: tokenPlnTiers }));
    expect(fee.adminFee).toBe(1500);
    expect(fee.tier).toBeNull();
  });

  it("handles common tarik tunai tiers", () => {
    const svc = service({ useTieredFee: true, feeTiers: tarikTunaiTiers, cashEffect: "out", bankEffect: "none" });
    expect(calculateServiceFee(500000, svc).adminFee).toBe(2500);
    expect(calculateServiceFee(3000000, svc).adminFee).toBe(3500);
    expect(calculateServiceFee(10000000, svc).adminFee).toBe(5000);
  });
});

describe("Service transaction totals", () => {
  it("adds admin fee to total payable", () => {
    expect(calculateTotalWithAdminFee(500000, 2500)).toBe(502500);
    expect(calculateTotalWithAdminFee(500000, 0)).toBe(500000);
  });

  it("uses agent fee as profit", () => {
    expect(calculateAgentProfit(2500)).toBe(2500);
  });
});

describe("Service cash flow calculation", () => {
  it("calculates cash-in flow with fee paid in cash", () => {
    const flow = calculateCashFlow("in", 100000, 2500, "cash");
    expect(flow.cashReceived).toBe(102500);
    expect(flow.cashDispensed).toBe(0);
    expect(flow.cashDelta).toBe(102500);
    expect(flow.physicalCashAmount).toBe(102500);
  });

  it("calculates cash-out flow with fee deducted from nominal", () => {
    const flow = calculateCashFlow("out", 100000, 2500, "deducted");
    expect(flow.cashReceived).toBe(0);
    expect(flow.cashDispensed).toBe(97500);
    expect(flow.cashDelta).toBe(-97500);
    expect(flow.physicalCashAmount).toBe(97500);
  });

  it("calculates cash-out flow with fee paid separately", () => {
    const flow = calculateCashFlow("out", 100000, 2500, "cash");
    expect(flow.cashDispensed).toBe(100000);
    expect(flow.cashDelta).toBe(-100000);
  });

  it("returns zero flow when cash effect is none", () => {
    expect(calculateCashFlow("none", 100000, 2500, "cash")).toEqual({
      cashReceived: 0,
      cashDispensed: 0,
      cashDelta: 0,
      physicalCashAmount: 0,
    });
  });
});


describe("Service bank settlement flow", () => {
  it("records tarik tunai charged scenario: customer transfers nominal + fee to agent", () => {
    const bank = calculateBankFlow("out", "in", 100000, 5000, "charged");
    const cash = calculateCashFlow("out", 100000, 5000, "charged");
    expect(bank.bankDelta).toBe(105000);
    expect(cash.cashDelta).toBe(-100000);
    expect(cash.cashDispensed).toBe(100000);
  });
});
