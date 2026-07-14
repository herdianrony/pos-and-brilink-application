import { describe, it, expect } from "vitest";
import { getFlowType, getFlowConfig, getToneClasses, FEE_METHOD_LABELS, calculateCashFlow } from "@/lib/service-flow";

// ── Flow type detection ───────────────────────────
describe("service-flow: getFlowType", () => {
  it("should detect cash_withdrawal from name", () => {
    expect(getFlowType({ cashEffect: "out", bankEffect: "none", name: "Tarik Tunai Bank" })).toBe("cash_withdrawal");
    expect(getFlowType({ cashEffect: "out", bankEffect: "none", name: "Tarik Tunai Bank Lain" })).toBe("cash_withdrawal");
  });

  it("should detect cash_withdrawal from category", () => {
    expect(getFlowType({ cashEffect: "out", bankEffect: "none", name: "Custom", categoryName: "Penarikan Tunai" })).toBe("cash_withdrawal");
  });

  it("should detect cash_withdrawal from cashEffect=out + bankEffect=none", () => {
    expect(getFlowType({ cashEffect: "out", bankEffect: "none", name: "Custom Service" })).toBe("cash_withdrawal");
  });

  it("should detect cash_deposit from name", () => {
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Setor Tunai Bank" })).toBe("cash_deposit");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Setor Tunai Bank Lain" })).toBe("cash_deposit");
  });

  it("should detect cash_deposit from cashEffect=in + bankEffect=out", () => {
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Custom Service" })).toBe("cash_deposit");
  });

  it("should detect transfer from name", () => {
    expect(getFlowType({ cashEffect: "out", bankEffect: "in", name: "Transfer Antar Bank" })).toBe("transfer");
    expect(getFlowType({ cashEffect: "out", bankEffect: "in", name: "Transfer Sesama Bank" })).toBe("transfer");
  });

  it("should detect transfer from category", () => {
    expect(getFlowType({ cashEffect: "out", bankEffect: "in", name: "Custom", categoryName: "Transfer" })).toBe("transfer");
  });

  it("should detect topup from pulsa/game/voucher keywords", () => {
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Pulsa Reguler" })).toBe("topup");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Paket Data" })).toBe("topup");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Voucher Game 12K" })).toBe("topup");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Top Up E-Wallet" })).toBe("topup");
  });

  it("should detect payment from tagihan/cicilan/pln keywords", () => {
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Tagihan PLN" })).toBe("payment");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Tagihan Air (PDAM)" })).toBe("payment");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "BPJS Kesehatan" })).toBe("payment");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Cicilan FIF" })).toBe("payment");
    expect(getFlowType({ cashEffect: "in", bankEffect: "out", name: "Token PLN 20K" })).toBe("payment");
  });

  it("should default to payment for unknown services", () => {
    expect(getFlowType({ cashEffect: "none", bankEffect: "none", name: "Cek Saldo" })).toBe("payment");
  });
});

// ── Flow config ───────────────────────────────────
describe("service-flow: getFlowConfig", () => {
  it("should return config with correct title for withdrawal", () => {
    const config = getFlowConfig({ cashEffect: "out", bankEffect: "none", name: "Tarik Tunai Bank" });
    expect(config.title).toBe("Tarik Tunai");
    expect(config.subtitle).toBe("Kas keluar ke nasabah");
    expect(config.tone).toBe("warning");
    expect(config.accountSelectorLabel).toBe("Sumber Saldo / Float Agen");
    expect(config.cashBadgeText).toContain("Kas akan berkurang");
  });

  it("should return config with correct title for deposit", () => {
    const config = getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Setor Tunai Bank" });
    expect(config.title).toBe("Setor Tunai");
    expect(config.subtitle).toBe("Kas masuk dari nasabah");
    expect(config.tone).toBe("success");
    expect(config.accountSelectorLabel).toBe("Rekening Settlement Agen");
    expect(config.cashBadgeText).toContain("Kas akan bertambah");
  });

  it("should return config with correct primary action for withdrawal", () => {
    const config = getFlowConfig({ cashEffect: "out", bankEffect: "none", name: "Tarik Tunai" });
    expect(config.primaryActionText).toContain("Serahkan");
    expect(config.confirmationConfirmText).toContain("Diserahkan");
  });

  it("should return config with correct primary action for deposit", () => {
    const config = getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Setor Tunai" });
    expect(config.primaryActionText).toContain("Terima");
    expect(config.confirmationConfirmText).toContain("Diterima");
  });

  it("should show denomination only for deposit", () => {
    expect(getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Setor Tunai" }).showDenomination).toBe(true);
    expect(getFlowConfig({ cashEffect: "out", bankEffect: "none", name: "Tarik Tunai" }).showDenomination).toBe(false);
  });

  it("should have fee method options for all flows", () => {
    const withdrawal = getFlowConfig({ cashEffect: "out", bankEffect: "none", name: "Tarik Tunai" });
    expect(withdrawal.showFeeMethod).toBe(true);
    expect(withdrawal.allowedFeeMethods).toContain("cash");
    expect(withdrawal.allowedFeeMethods).toContain("deducted");
    expect(withdrawal.allowedFeeMethods).toContain("charged");
  });

  it("deposit should not allow deducted fee method", () => {
    const deposit = getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Setor Tunai" });
    expect(deposit.allowedFeeMethods).not.toContain("deducted");
  });
});

// ── Tone classes ──────────────────────────────────
describe("service-flow: getToneClasses", () => {
  it("should return warning tone for withdrawal", () => {
    const classes = getToneClasses("warning");
    expect(classes.badge).toContain("amber");
    expect(classes.accent).toContain("amber");
    expect(classes.button).toContain("amber");
  });

  it("should return success tone for deposit", () => {
    const classes = getToneClasses("success");
    expect(classes.badge).toContain("emerald");
    expect(classes.accent).toContain("emerald");
    expect(classes.button).toContain("emerald");
  });

  it("should return info tone for transfer", () => {
    const classes = getToneClasses("info");
    expect(classes.badge).toContain("blue");
  });

  it("should return primary tone as default", () => {
    const classes = getToneClasses("primary");
    expect(classes.badge).toContain("purple");
  });
});

// ── Fee method labels ─────────────────────────────
describe("service-flow: FEE_METHOD_LABELS", () => {
  it("should have labels for all fee methods", () => {
    expect(FEE_METHOD_LABELS.cash).toBeTruthy();
    expect(FEE_METHOD_LABELS.deducted).toBeTruthy();
    expect(FEE_METHOD_LABELS.charged).toBeTruthy();
  });

  it("should have descriptive labels", () => {
    expect(FEE_METHOD_LABELS.cash.toLowerCase()).toContain("tunai");
    expect(FEE_METHOD_LABELS.deducted.toLowerCase()).toContain("dipotong");
    expect(FEE_METHOD_LABELS.charged.toLowerCase()).toContain("dibebankan");
  });
});

// ── S-02: calculateCashFlow (unified calculator) ──
describe("service-flow: calculateCashFlow (S-02)", () => {
  it("should calculate cash received for deposit with cash fee", () => {
    // Setor 100000, fee 2500 cash → kas naik 102500
    const r = calculateCashFlow("in", 100000, 2500, "cash");
    expect(r.cashReceived).toBe(102500);
    expect(r.cashDispensed).toBe(0);
    expect(r.cashDelta).toBe(102500);
    expect(r.physicalCashAmount).toBe(102500);
  });

  it("should calculate cash received for deposit with charged fee", () => {
    // Setor 100000, fee 2500 charged → kas naik 100000 (fee dari rekening)
    const r = calculateCashFlow("in", 100000, 2500, "charged");
    expect(r.cashReceived).toBe(100000);
    expect(r.cashDelta).toBe(100000);
  });

  it("should calculate cash dispensed for withdrawal with cash fee", () => {
    // Tarik 100000, fee 2500 cash → kas turun 100000 (fee terpisah)
    const r = calculateCashFlow("out", 100000, 2500, "cash");
    expect(r.cashDispensed).toBe(100000);
    expect(r.cashReceived).toBe(0);
    expect(r.cashDelta).toBe(-100000);
    expect(r.physicalCashAmount).toBe(100000);
  });

  it("S-02: should calculate cash dispensed for withdrawal with deducted fee", () => {
    // Tarik 100000, fee 2500 deducted → nasabah terima 97500, kas turun 97500
    const r = calculateCashFlow("out", 100000, 2500, "deducted");
    expect(r.cashDispensed).toBe(97500); // S-02 fix: nominal - fee
    expect(r.cashDelta).toBe(-97500);
    expect(r.physicalCashAmount).toBe(97500);
  });

  it("should calculate cash dispensed for withdrawal with charged fee", () => {
    // Tarik 100000, fee 2500 charged → kas turun 100000 (fee dari rekening nasabah)
    const r = calculateCashFlow("out", 100000, 2500, "charged");
    expect(r.cashDispensed).toBe(100000);
    expect(r.cashDelta).toBe(-100000);
  });

  it("should return zero for none cash effect", () => {
    const r = calculateCashFlow("none", 100000, 2500, "cash");
    expect(r.cashReceived).toBe(0);
    expect(r.cashDispensed).toBe(0);
    expect(r.cashDelta).toBe(0);
  });

  it("should handle zero fee", () => {
    const r = calculateCashFlow("in", 100000, 0, "cash");
    expect(r.cashReceived).toBe(100000);
    expect(r.cashDelta).toBe(100000);
  });

  it("should not go negative for deducted when fee > nominal", () => {
    // Edge case: fee > nominal
    const r = calculateCashFlow("out", 1000, 2500, "deducted");
    expect(r.cashDispensed).toBe(0); // max(0, 1000-2500) = 0
  });
});

// ── S-04: inquiry flow config ─────────────────────
describe("service-flow: inquiry flow (S-04)", () => {
  it("should return inquiry config from DB flowType", () => {
    const config = getFlowConfig({
      cashEffect: "none",
      bankEffect: "none",
      name: "Cek Saldo",
      flowType: "inquiry",
    });
    expect(config.flowType).toBe("inquiry");
    expect(config.requiresNominal).toBe(false);
    expect(config.requiresCashHandling).toBe(false);
    expect(config.showFeeMethod).toBe(false);
    expect(config.allowedFeeMethods).toHaveLength(0);
  });

  it("should not require nominal for inquiry", () => {
    const config = getFlowConfig({
      cashEffect: "none",
      bankEffect: "none",
      name: "Cek Saldo",
      flowType: "inquiry",
    });
    expect(config.requiresNominal).toBe(false);
  });

  it("should involve external provider for transfer/payment/topup (S-07)", () => {
    expect(getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Transfer", flowType: "transfer" }).involvesExternalProvider).toBe(true);
    expect(getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Tagihan PLN", flowType: "payment" }).involvesExternalProvider).toBe(true);
    expect(getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Pulsa", flowType: "topup" }).involvesExternalProvider).toBe(true);
  });

  it("should NOT involve external provider for cash_withdrawal/cash_deposit/inquiry (S-07)", () => {
    expect(getFlowConfig({ cashEffect: "out", bankEffect: "none", name: "Tarik", flowType: "cash_withdrawal" }).involvesExternalProvider).toBe(false);
    expect(getFlowConfig({ cashEffect: "in", bankEffect: "out", name: "Setor", flowType: "cash_deposit" }).involvesExternalProvider).toBe(false);
    expect(getFlowConfig({ cashEffect: "none", bankEffect: "none", name: "Cek", flowType: "inquiry" }).involvesExternalProvider).toBe(false);
  });
});

// ── S-04: getFlowConfig prefers DB flowType ───────
describe("service-flow: getFlowConfig prefers DB flowType (S-04)", () => {
  it("should use DB flowType when available", () => {
    // Name suggests topup but DB says payment
    const config = getFlowConfig({
      cashEffect: "in",
      bankEffect: "out",
      name: "Pulsa Reguler",
      flowType: "payment",
    });
    expect(config.flowType).toBe("payment");
  });

  it("should fallback to keyword detection when flowType is null", () => {
    const config = getFlowConfig({
      cashEffect: "in",
      bankEffect: "out",
      name: "Pulsa Reguler",
      flowType: null,
    });
    expect(config.flowType).toBe("topup");
  });

  it("should fallback to keyword detection when flowType is undefined", () => {
    const config = getFlowConfig({
      cashEffect: "in",
      bankEffect: "out",
      name: "Pulsa Reguler",
    });
    expect(config.flowType).toBe("topup");
  });
});
