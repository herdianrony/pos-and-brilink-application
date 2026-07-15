export interface TransactionLike {
  status?: string | null;
  totalAmount: string;
  profit?: string | null;
}

export const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" | "primary" | "purple" }> = {
  completed: { label: "Selesai", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  void: { label: "Dibatalkan", variant: "danger" },
  reversed: { label: "Di-reverse", variant: "danger" },
  draft: { label: "Draft", variant: "primary" },
};

export function getTransactionStatus(status?: string | null): string {
  return status || "completed";
}

export function isCancelledStatus(status?: string | null): boolean {
  const normalized = getTransactionStatus(status);
  return normalized === "void" || normalized === "reversed";
}

export function filterTransactionsByStatus<T extends { status?: string | null }>(transactions: T[], statusFilter: string): T[] {
  if (statusFilter === "all") return transactions;
  return transactions.filter((transaction) => getTransactionStatus(transaction.status) === statusFilter);
}

export function calculateTransactionTotals(transactions: TransactionLike[]) {
  const active = transactions.filter((transaction) => !isCancelledStatus(transaction.status));
  return {
    revenue: active.reduce((sum, transaction) => sum + parseFloat(transaction.totalAmount), 0),
    profit: active.reduce((sum, transaction) => sum + parseFloat(transaction.profit || "0"), 0),
    pendingCount: transactions.filter((transaction) => getTransactionStatus(transaction.status) === "pending").length,
  };
}

export function getStatusConfig(status?: string | null) {
  return STATUS_CONFIG[getTransactionStatus(status)] || STATUS_CONFIG.completed;
}
