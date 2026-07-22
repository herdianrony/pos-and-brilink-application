import { useState, type FormEvent } from "react";
import { addDebtPayment, buildDebtReminder, createDebt, type DebtRow } from "../api";

export function useDebtBook({
  saving,
  setSaving,
  onRefresh,
  onMessage,
}: {
  saving: boolean;
  setSaving: (value: boolean) => void;
  onRefresh: () => Promise<unknown>;
  onMessage: (message: string) => void;
}) {
  const [debtForm, setDebtForm] = useState({ customer_name: "", phone: "", amount: "0", notes: "" });
  const [debtPaymentForm, setDebtPaymentForm] = useState({ debt_id: "", amount: "0", notes: "Cicilan utang" });

  async function submitDebt(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createDebt({ customer_name: debtForm.customer_name, phone: debtForm.phone, amount: Number(debtForm.amount || 0), notes: debtForm.notes });
      setDebtForm({ customer_name: "", phone: "", amount: "0", notes: "" });
      await onRefresh();
      onMessage("Utang pelanggan berhasil dicatat");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitDebtPayment(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await addDebtPayment({ debt_id: Number(debtPaymentForm.debt_id), amount: Number(debtPaymentForm.amount || 0), notes: debtPaymentForm.notes });
      setDebtPaymentForm({ ...debtPaymentForm, amount: "0" });
      await onRefresh();
      onMessage("Pembayaran utang berhasil dicatat");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function copyDebtReminder(debt: DebtRow) {
    try {
      const text = await buildDebtReminder({ debt_id: debt.id });
      await navigator.clipboard.writeText(text);
      onMessage("Pesan pengingat utang disalin");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    debtForm,
    setDebtForm,
    debtPaymentForm,
    setDebtPaymentForm,
    submitDebt,
    submitDebtPayment,
    copyDebtReminder,
  };
}
