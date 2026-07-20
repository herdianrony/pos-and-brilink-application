import { useState, type FormEvent } from "react";
import { createAgentTransaction } from "../api";
import type { AgentForm } from "../types";

export function useAgentTransaction({
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
  const [agentStep, setAgentStep] = useState<1 | 2 | 3 | 4>(1);
  const [agentForm, setAgentForm] = useState<AgentForm>({ service_name: "Tarik Tunai", customer_name: "", amount: "0", fee: "5000", provider_cost: "0", account_id: "", cash_effect: "0", bank_effect: "0", notes: "" });

  function applyAgentPreset(kind: "withdraw" | "deposit" | "transfer" | "payment") {
    if (kind === "withdraw") setAgentForm({ ...agentForm, service_name: "Tarik Tunai", cash_effect: "0", bank_effect: "0", fee: "5000", provider_cost: "0" });
    if (kind === "deposit") setAgentForm({ ...agentForm, service_name: "Setor Tunai", cash_effect: "0", bank_effect: "0", fee: "5000", provider_cost: "0" });
    if (kind === "transfer") setAgentForm({ ...agentForm, service_name: "Transfer", cash_effect: "0", bank_effect: "0", fee: "5000", provider_cost: "0" });
    if (kind === "payment") setAgentForm({ ...agentForm, service_name: "Pembayaran / Topup", cash_effect: "0", bank_effect: "0", fee: "2500", provider_cost: "0" });
    setAgentStep(2);
  }

  async function submitAgentTransaction(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createAgentTransaction({
        service_name: agentForm.service_name,
        customer_name: agentForm.customer_name,
        amount: Number(agentForm.amount || 0),
        fee: Number(agentForm.fee || 0),
        provider_cost: Number(agentForm.provider_cost || 0),
        account_id: agentForm.account_id ? Number(agentForm.account_id) : null,
        cash_effect: Number(agentForm.cash_effect || 0),
        bank_effect: Number(agentForm.bank_effect || 0),
        notes: agentForm.notes,
      });
      setAgentStep(1);
      await onRefresh();
      onMessage("Transaksi layanan agen berhasil dicatat");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return {
    agentForm,
    setAgentForm,
    agentStep,
    setAgentStep,
    applyAgentPreset,
    submitAgentTransaction,
  };
}
