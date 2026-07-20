import { useState } from "react";
import { listTransactionItems, type TransactionItemRow, type TransactionRow } from "../api";

export function useTransactionDetail(onMessage: (message: string) => void) {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<TransactionItemRow[]>([]);

  async function openTransactionDetail(transaction: TransactionRow) {
    setSelectedTransaction(transaction);
    try {
      setSelectedTransactionItems(await listTransactionItems({ transaction_id: transaction.id }));
    } catch (error) {
      setSelectedTransactionItems([]);
      onMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    selectedTransaction,
    selectedTransactionItems,
    openTransactionDetail,
  };
}
