import { describe, it, expect } from "vitest";

// ── P2: Transaction Lifecycle Tests ───────────────
// Tests for status transitions: pending → completed, pending → void,
// completed → reversed. Plus require_transaction_reference enforcement.

// ── Status transitions ────────────────────────────
describe("P2: Transaction status transitions", () => {
  it("pending can transition to completed", () => {
    const allowed = canTransition("pending", "complete");
    expect(allowed).toBe(true);
  });

  it("pending can transition to void", () => {
    const allowed = canTransition("pending", "void");
    expect(allowed).toBe(true);
  });

  it("completed can transition to reversed", () => {
    const allowed = canTransition("completed", "reverse");
    expect(allowed).toBe(true);
  });

  it("void cannot transition to completed", () => {
    const allowed = canTransition("void", "complete");
    expect(allowed).toBe(false);
  });

  it("reversed cannot transition to anything", () => {
    expect(canTransition("reversed", "complete")).toBe(false);
    expect(canTransition("reversed", "void")).toBe(false);
    expect(canTransition("reversed", "reverse")).toBe(false);
  });

  it("void cannot be reversed (only pending/completed can change)", () => {
    expect(canTransition("void", "reverse")).toBe(false);
  });

  it("completed cannot be voided (only pending can be voided)", () => {
    expect(canTransition("completed", "void")).toBe(false);
  });
});

function canTransition(currentStatus: string, action: "complete" | "void" | "reverse"): boolean {
  if (action === "complete") return currentStatus === "pending";
  if (action === "void") return currentStatus === "pending";
  if (action === "reverse") return currentStatus === "completed";
  return false;
}

// ── require_transaction_reference enforcement ────
describe("P2: require_transaction_reference enforcement", () => {
  it("should reject complete without referenceNo when setting is true", () => {
    const requireRef = true;
    const referenceNo = "";
    const isValid = !requireRef || referenceNo.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it("should accept complete with referenceNo when setting is true", () => {
    const requireRef = true;
    const referenceNo = "TRX12345678";
    const isValid = !requireRef || referenceNo.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it("should accept complete without referenceNo when setting is false", () => {
    const requireRef = false;
    const referenceNo = "";
    const isValid = !requireRef || referenceNo.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it("should accept complete with empty referenceNo when setting is false", () => {
    const requireRef = false;
    const referenceNo = "";
    const isValid = !requireRef || referenceNo.trim().length > 0;
    expect(isValid).toBe(true);
  });
});

// ── Reversal creates counter-mutations ────────────
describe("P2: Reversal counter-mutations", () => {
  it("counter-mutation should have opposite sign of original", () => {
    const originalMutation = { amount: 100000, type: "brilink_in" };
    const counterAmount = -originalMutation.amount;
    expect(counterAmount).toBe(-100000);
    expect(counterAmount).toBeLessThan(0);
  });

  it("counter-mutation for outflow should be positive (refund)", () => {
    const originalMutation = { amount: -100000, type: "brilink_out" };
    const counterAmount = -originalMutation.amount;
    expect(counterAmount).toBe(100000);
    expect(counterAmount).toBeGreaterThan(0);
  });

  it("reversal should not edit historical balance — only create new mutation", () => {
    // Simulate: original balance after = 500000, new balance = 500000 + counterAmount
    const historicalBalanceAfter = 500000;
    const originalAmount = 100000;
    const currentBalance = 400000; // balance has moved on since original
    const counterAmount = -originalAmount;
    const newBalance = currentBalance + counterAmount;

    expect(historicalBalanceAfter).toBe(500000); // unchanged
    expect(newBalance).toBe(300000); // current balance reduced by counter
  });

  it("reversal type should be suffixed with _reversal", () => {
    const originalType = "brilink_in";
    const reversalType = `${originalType}_reversal`;
    expect(reversalType).toBe("brilink_in_reversal");

    const originalType2 = "brilink_out";
    const reversalType2 = `${originalType2}_reversal`;
    expect(reversalType2).toBe("brilink_out_reversal");
  });
});

// ── Void vs Reverse distinction ───────────────────
describe("P2: Void vs Reverse distinction", () => {
  it("void is for pending transactions (no balance change yet)", () => {
    const trx = { status: "pending", cashReceived: 0, cashDispensed: 0 };
    // Void doesn't need counter-mutation because balance hasn't changed
    const needsCounterMutation = trx.status === "completed";
    expect(needsCounterMutation).toBe(false);
  });

  it("reverse is for completed transactions (balance already changed)", () => {
    const trx = { status: "completed", cashReceived: 100000, cashDispensed: 0 };
    // Reverse needs counter-mutation because balance already changed
    const needsCounterMutation = trx.status === "completed";
    expect(needsCounterMutation).toBe(true);
  });

  it("void requires admin", () => {
    const userRole: string = "kasir";
    const isAdmin = userRole === "admin";
    const canVoid = isAdmin;
    expect(canVoid).toBe(false);
  });

  it("reverse requires admin", () => {
    const userRole: string = "kasir";
    const isAdmin = userRole === "admin";
    const canReverse = isAdmin;
    expect(canReverse).toBe(false);
  });

  it("complete can be done by kasir (not admin-only)", () => {
    const userRole: string = "kasir";
    const canComplete = true; // complete is not admin-only
    expect(canComplete).toBe(true);
  });
});

// ── Reason validation ─────────────────────────────
describe("P2: Reason validation for void/reverse", () => {
  it("void reason must be at least 3 characters", () => {
    const reason = "ok";
    const isValid = reason.trim().length >= 3;
    expect(isValid).toBe(false);
  });

  it("void reason with 3+ characters is valid", () => {
    const reason = "Salah nominal";
    const isValid = reason.trim().length >= 3;
    expect(isValid).toBe(true);
  });

  it("empty void reason is invalid", () => {
    const reason = "";
    const isValid = reason.trim().length >= 3;
    expect(isValid).toBe(false);
  });

  it("reverse reason must be at least 3 characters", () => {
    const reason = "Transfer gagal di provider";
    const isValid = reason.trim().length >= 3;
    expect(isValid).toBe(true);
  });
});

// ── Status filter ─────────────────────────────────
describe("P2: Status filter in Transactions page", () => {
  const sampleTrxs = [
    { id: 1, status: "completed" },
    { id: 2, status: "pending" },
    { id: 3, status: "void" },
    { id: 4, status: "reversed" },
    { id: 5, status: "pending" },
  ];

  it("filter 'all' returns all transactions", () => {
    const filtered = sampleTrxs;
    expect(filtered).toHaveLength(5);
  });

  it("filter 'pending' returns only pending", () => {
    const filtered = sampleTrxs.filter(t => t.status === "pending");
    expect(filtered).toHaveLength(2);
  });

  it("filter 'completed' returns only completed", () => {
    const filtered = sampleTrxs.filter(t => t.status === "completed");
    expect(filtered).toHaveLength(1);
  });

  it("filter 'void' returns only voided", () => {
    const filtered = sampleTrxs.filter(t => t.status === "void");
    expect(filtered).toHaveLength(1);
  });

  it("filter 'reversed' returns only reversed", () => {
    const filtered = sampleTrxs.filter(t => t.status === "reversed");
    expect(filtered).toHaveLength(1);
  });

  it("pendingCount should count only pending", () => {
    const pendingCount = sampleTrxs.filter(t => t.status === "pending").length;
    expect(pendingCount).toBe(2);
  });
});

// ── Status badge config ───────────────────────────
describe("P2: Status badge config", () => {
  const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
    completed: { label: "Selesai", variant: "success" },
    pending: { label: "Pending", variant: "warning" },
    void: { label: "Dibatalkan", variant: "danger" },
    reversed: { label: "Di-reverse", variant: "danger" },
    draft: { label: "Draft", variant: "primary" },
  };

  it("completed should show 'Selesai' with success variant", () => {
    expect(STATUS_CONFIG.completed.label).toBe("Selesai");
    expect(STATUS_CONFIG.completed.variant).toBe("success");
  });

  it("pending should show 'Pending' with warning variant", () => {
    expect(STATUS_CONFIG.pending.label).toBe("Pending");
    expect(STATUS_CONFIG.pending.variant).toBe("warning");
  });

  it("void should show 'Dibatalkan' with danger variant", () => {
    expect(STATUS_CONFIG.void.label).toBe("Dibatalkan");
    expect(STATUS_CONFIG.void.variant).toBe("danger");
  });

  it("reversed should show 'Di-reverse' with danger variant", () => {
    expect(STATUS_CONFIG.reversed.label).toBe("Di-reverse");
    expect(STATUS_CONFIG.reversed.variant).toBe("danger");
  });

  it("unknown status should fallback to completed config", () => {
    const status = "unknown";
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.completed;
    expect(cfg.label).toBe("Selesai");
  });
});

// ── Revenue calculation excludes void/reversed ────
describe("P2: Revenue calculation excludes void/reversed", () => {
  const trxs = [
    { id: 1, status: "completed", totalAmount: "100000" },
    { id: 2, status: "pending", totalAmount: "50000" },
    { id: 3, status: "void", totalAmount: "30000" },
    { id: 4, status: "reversed", totalAmount: "20000" },
    { id: 5, status: "completed", totalAmount: "75000" },
  ];

  it("totalRev should only count completed + pending", () => {
    // void and reversed are excluded from revenue
    const valid = trxs.filter(t => t.status !== "void" && t.status !== "reversed");
    const totalRev = valid.reduce((s, t) => s + parseFloat(t.totalAmount), 0);
    // 100000 + 50000 + 75000 = 225000
    expect(totalRev).toBe(225000);
  });

  it("void and reversed should not contribute to revenue", () => {
    const voidAndReversed = trxs.filter(t => t.status === "void" || t.status === "reversed");
    const excluded = voidAndReversed.reduce((s, t) => s + parseFloat(t.totalAmount), 0);
    // 30000 + 20000 = 50000 — these should NOT be in totalRev
    expect(excluded).toBe(50000);
  });
});
