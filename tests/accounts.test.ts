import { describe, it, expect } from "vitest";

// ── Accounts Business Logic Tests ────────────────
// Test transfer, adjust, balance calculation, mutation types

interface Account {
  id: number;
  code: string;
  name: string;
  balance: number;
  minBalance: number;
  isActive: boolean;
}

interface Mutation {
  accountId: number;
  type: string;
  amount: number;
  balanceAfter: number;
  notes: string | null;
}

// ── Transfer Logic ───────────────────────────────
function executeTransfer(from: Account, to: Account, amount: number): { fromNew: Account; toNew: Account; mutations: Mutation[] } | { error: string } {
  if (amount <= 0) return { error: "Invalid amount" };
  if (from.balance < amount) return { error: "Insufficient balance" };

  const fromNewBalance = from.balance - amount;
  const toNewBalance = to.balance + amount;

  return {
    fromNew: { ...from, balance: fromNewBalance },
    toNew: { ...to, balance: toNewBalance },
    mutations: [
      { accountId: from.id, type: "transfer_out", amount: -amount, balanceAfter: fromNewBalance, notes: `Transfer ke ${to.name}` },
      { accountId: to.id, type: "transfer_in", amount, balanceAfter: toNewBalance, notes: `Transfer dari ${from.name}` },
    ],
  };
}

// ── Adjust Logic ─────────────────────────────────
function executeAdjust(acc: Account, amount: number, type: string, notes: string): { account: Account; mutation: Mutation } | { error: string } {
  const newBalance = acc.balance + amount;
  return {
    account: { ...acc, balance: newBalance },
    mutation: { accountId: acc.id, type, amount, balanceAfter: newBalance, notes },
  };
}

// ── Running Balance ──────────────────────────────
function calculateRunningBalance(openingBalance: number, mutations: Mutation[]): { runningBalances: number[]; finalBalance: number } {
  let balance = openingBalance;
  const runningBalances: number[] = [];
  for (const m of mutations) {
    balance += m.amount;
    runningBalances.push(balance);
  }
  return { runningBalances, finalBalance: balance };
}

// ── Low Balance Check ────────────────────────────
function isLowBalance(acc: Account): boolean {
  return acc.balance < acc.minBalance;
}

// ── Summary Calculation ──────────────────────────
function calculateSummary(mutations: Mutation[], openingBalance: number): {
  count: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  netChange: number;
} {
  let totalIn = 0;
  let totalOut = 0;
  for (const m of mutations) {
    if (m.amount > 0) totalIn += m.amount;
    else totalOut += Math.abs(m.amount);
  }
  const closingBalance = openingBalance + totalIn - totalOut;
  return {
    count: mutations.length,
    totalIn,
    totalOut,
    closingBalance,
    netChange: closingBalance - openingBalance,
  };
}

// ── Mock Data ────────────────────────────────────
const mockAccounts: Account[] = [
  { id: 1, code: "cash", name: "Kas Tunai", balance: 500000, minBalance: 200000, isActive: true },
  { id: 2, code: "bank_bri", name: "M-Banking BRI", balance: 2000000, minBalance: 500000, isActive: true },
  { id: 3, code: "bank_bca", name: "M-Banking BCA", balance: 1000000, minBalance: 300000, isActive: true },
];

// ── Tests ────────────────────────────────────────

describe("Accounts: executeTransfer", () => {
  const from = mockAccounts[0]; // 500K
  const to = mockAccounts[1]; // 2M

  it("should transfer successfully", () => {
    const result = executeTransfer(from, to, 100000);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.fromNew.balance).toBe(400000);
      expect(result.toNew.balance).toBe(2100000);
      expect(result.mutations).toHaveLength(2);
      expect(result.mutations[0].type).toBe("transfer_out");
      expect(result.mutations[1].type).toBe("transfer_in");
    }
  });

  it("should reject transfer with insufficient balance", () => {
    const result = executeTransfer(from, to, 600000);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Insufficient balance");
    }
  });

  it("should reject zero or negative amount", () => {
    const result = executeTransfer(from, to, 0);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Invalid amount");
    }
  });

  it("should create correct mutation records", () => {
    const result = executeTransfer(from, to, 200000);
    if (!("error" in result)) {
      expect(result.mutations[0].amount).toBe(-200000);
      expect(result.mutations[0].balanceAfter).toBe(300000);
      expect(result.mutations[1].amount).toBe(200000);
      expect(result.mutations[1].balanceAfter).toBe(2200000);
    }
  });

  it("should transfer exact balance (edge case)", () => {
    const result = executeTransfer(from, to, 500000);
    if (!("error" in result)) {
      expect(result.fromNew.balance).toBe(0);
    }
  });
});

describe("Accounts: executeAdjust", () => {
  const acc = mockAccounts[0]; // 500K

  it("should add positive amount", () => {
    const result = executeAdjust(acc, 100000, "adjustment_in", "Tambah saldo");
    if ("account" in result) {
      expect(result.account.balance).toBe(600000);
      expect(result.mutation.type).toBe("adjustment_in");
      expect(result.mutation.balanceAfter).toBe(600000);
    }
  });

  it("should subtract negative amount", () => {
    const result = executeAdjust(acc, -50000, "adjustment_out", "Kurangi saldo");
    if ("account" in result) {
      expect(result.account.balance).toBe(450000);
      expect(result.mutation.type).toBe("adjustment_out");
      expect(result.mutation.amount).toBe(-50000);
    }
  });

  it("should handle zero amount", () => {
    const result = executeAdjust(acc, 0, "adjustment", "Zero");
    if ("account" in result) {
      expect(result.account.balance).toBe(500000);
    }
  });
});

describe("Accounts: calculateRunningBalance", () => {
  const mutations: Mutation[] = [
    { accountId: 1, type: "opening", amount: 500000, balanceAfter: 500000, notes: "Saldo awal" },
    { accountId: 1, type: "adjustment_in", amount: 100000, balanceAfter: 600000, notes: "Tambah" },
    { accountId: 1, type: "adjustment_out", amount: -50000, balanceAfter: 550000, notes: "Kurang" },
    { accountId: 1, type: "transfer_out", amount: -200000, balanceAfter: 350000, notes: "Transfer" },
  ];

  it("should calculate running balance correctly", () => {
    // opening = 0 (initial), mutations add up
    const result = calculateRunningBalance(0, mutations);
    expect(result.runningBalances).toHaveLength(4);
    expect(result.runningBalances[0]).toBe(500000);
    expect(result.runningBalances[1]).toBe(600000);
    expect(result.runningBalances[2]).toBe(550000);
    expect(result.runningBalances[3]).toBe(350000);
    expect(result.finalBalance).toBe(350000);
  });

  it("should handle empty mutations", () => {
    const result = calculateRunningBalance(500000, []);
    expect(result.runningBalances).toHaveLength(0);
    expect(result.finalBalance).toBe(500000);
  });
});

describe("Accounts: isLowBalance", () => {
  it("should return true when balance < minBalance", () => {
    const acc = { ...mockAccounts[0], balance: 100000, minBalance: 200000 };
    expect(isLowBalance(acc)).toBe(true);
  });

  it("should return false when balance >= minBalance", () => {
    const acc = { ...mockAccounts[0], balance: 500000, minBalance: 200000 };
    expect(isLowBalance(acc)).toBe(false);
  });

  it("should return false when balance equals minBalance", () => {
    const acc = { ...mockAccounts[0], balance: 200000, minBalance: 200000 };
    expect(isLowBalance(acc)).toBe(false);
  });
});

describe("Accounts: calculateSummary", () => {
  const mutations: Mutation[] = [
    { accountId: 1, type: "adjustment_in", amount: 100000, balanceAfter: 600000, notes: "In" },
    { accountId: 1, type: "adjustment_out", amount: -50000, balanceAfter: 550000, notes: "Out" },
    { accountId: 1, type: "transfer_in", amount: 200000, balanceAfter: 750000, notes: "Transfer in" },
    { accountId: 1, type: "transfer_out", amount: -100000, balanceAfter: 650000, notes: "Transfer out" },
  ];

  it("should calculate correct summary", () => {
    const summary = calculateSummary(mutations, 500000);
    expect(summary.count).toBe(4);
    expect(summary.totalIn).toBe(300000);
    expect(summary.totalOut).toBe(150000);
    expect(summary.closingBalance).toBe(650000);
    expect(summary.netChange).toBe(150000);
  });

  it("should handle empty mutations", () => {
    const summary = calculateSummary([], 500000);
    expect(summary.count).toBe(0);
    expect(summary.totalIn).toBe(0);
    expect(summary.totalOut).toBe(0);
    expect(summary.closingBalance).toBe(500000);
    expect(summary.netChange).toBe(0);
  });

  it("should handle all positive mutations", () => {
    const allIn: Mutation[] = [
      { accountId: 1, type: "in", amount: 50000, balanceAfter: 550000, notes: "" },
      { accountId: 1, type: "in", amount: 100000, balanceAfter: 650000, notes: "" },
    ];
    const summary = calculateSummary(allIn, 500000);
    expect(summary.totalIn).toBe(150000);
    expect(summary.totalOut).toBe(0);
    expect(summary.closingBalance).toBe(650000);
  });

  it("should handle all negative mutations", () => {
    const allOut: Mutation[] = [
      { accountId: 1, type: "out", amount: -50000, balanceAfter: 450000, notes: "" },
      { accountId: 1, type: "out", amount: -100000, balanceAfter: 350000, notes: "" },
    ];
    const summary = calculateSummary(allOut, 500000);
    expect(summary.totalIn).toBe(0);
    expect(summary.totalOut).toBe(150000);
    expect(summary.closingBalance).toBe(350000);
  });
});
