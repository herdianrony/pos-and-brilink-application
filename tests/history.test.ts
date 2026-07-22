import { describe, expect, it } from "vitest";
import {
  calculateTransactionTotals,
  filterTransactionsByStatus,
  getStatusConfig,
  getTransactionStatus,
  isCancelledStatus,
} from "@/lib/history";

const transactions = [
  { id: 1, status: "completed", totalAmount: "100000", profit: "10000" },
  { id: 2, status: "pending", totalAmount: "50000", profit: "5000" },
  { id: 3, status: "void", totalAmount: "70000", profit: "7000" },
  { id: 4, status: "reversed", totalAmount: "90000", profit: "9000" },
  { id: 5, status: null, totalAmount: "25000", profit: null },
];

describe("history helpers", () => {
  it("normalizes missing status as completed", () => {
    expect(getTransactionStatus(null)).toBe("completed");
    expect(getTransactionStatus(undefined)).toBe("completed");
    expect(getTransactionStatus("pending")).toBe("pending");
  });

  it("detects cancelled statuses", () => {
    expect(isCancelledStatus("void")).toBe(true);
    expect(isCancelledStatus("reversed")).toBe(true);
    expect(isCancelledStatus("completed")).toBe(false);
    expect(isCancelledStatus(null)).toBe(false);
  });

  it("filters transactions by status", () => {
    expect(filterTransactionsByStatus(transactions, "all")).toHaveLength(5);
    expect(filterTransactionsByStatus(transactions, "pending").map(t => t.id)).toEqual([2]);
    expect(filterTransactionsByStatus(transactions, "completed").map(t => t.id)).toEqual([1, 5]);
  });

  it("calculates totals excluding void and reversed transactions", () => {
    const totals = calculateTransactionTotals(transactions);
    expect(totals.revenue).toBe(175000);
    expect(totals.profit).toBe(15000);
    expect(totals.pendingCount).toBe(1);
  });

  it("returns status config with fallback", () => {
    expect(getStatusConfig("pending")).toEqual({ label: "Pending", variant: "warning" });
    expect(getStatusConfig("unknown")).toEqual({ label: "Selesai", variant: "success" });
  });
});
