import { useState, type FormEvent } from "react";
import {
  adjustAccountBalance,
  bankFee,
  createAccount,
  ownerDraw,
  transferAccounts,
} from "../api";
import type { AccountRow } from "../api";
import type { CashModalType } from "../components/CashDialogs";

export function useCashActions({
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
  const [cashModal, setCashModal] = useState<CashModalType>(null);
  const [accountForm, setAccountForm] = useState({ code: "bri", name: "Rekening BRI", initial_balance: "0", min_balance: "0" });
  const [adjustForm, setAdjustForm] = useState({ account_id: "", amount: "0", notes: "Penyesuaian saldo" });
  const [transferForm, setTransferForm] = useState({ from_account_id: "", to_account_id: "", amount: "0", notes: "Transfer antar rekening" });
  const [ownerDrawForm, setOwnerDrawForm] = useState({ account_id: "", amount: "0", notes: "Ambil Uang Owner" });
  const [bankFeeForm, setBankFeeForm] = useState({ account_id: "", amount: "0", notes: "Potongan Bank / QRIS" });

  function openAddAccount() {
    setCashModal("account");
  }

  function openTransfer(account?: AccountRow) {
    if (account) setTransferForm((form) => ({ ...form, from_account_id: String(account.id) }));
    setCashModal("transfer");
  }

  function openAdjust(account: AccountRow) {
    setAdjustForm((form) => ({ ...form, account_id: String(account.id) }));
    setCashModal("adjust");
  }

  function openOwnerDraw(account: AccountRow) {
    setOwnerDrawForm((form) => ({ ...form, account_id: String(account.id) }));
    setCashModal("ownerDraw");
  }

  function openBankFee(account: AccountRow) {
    setBankFeeForm((form) => ({ ...form, account_id: String(account.id) }));
    setCashModal("bankFee");
  }

  async function submitAccount(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createAccount({
        code: accountForm.code,
        name: accountForm.name,
        initial_balance: Number(accountForm.initial_balance || 0),
        min_balance: Number(accountForm.min_balance || 0),
      });
      setAccountForm({ code: "", name: "", initial_balance: "0", min_balance: "0" });
      setCashModal(null);
      await onRefresh();
      onMessage("Rekening berhasil ditambahkan");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await adjustAccountBalance({
        account_id: Number(adjustForm.account_id),
        amount: Number(adjustForm.amount || 0),
        notes: adjustForm.notes,
      });
      setAdjustForm({ ...adjustForm, amount: "0" });
      setCashModal(null);
      await onRefresh();
      onMessage("Saldo berhasil disesuaikan");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitTransfer(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await transferAccounts({
        from_account_id: Number(transferForm.from_account_id),
        to_account_id: Number(transferForm.to_account_id),
        amount: Number(transferForm.amount || 0),
        notes: transferForm.notes,
      });
      setTransferForm({ ...transferForm, amount: "0" });
      setCashModal(null);
      await onRefresh();
      onMessage("Transfer antar rekening berhasil");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitOwnerDraw(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await ownerDraw({ account_id: Number(ownerDrawForm.account_id), amount: Number(ownerDrawForm.amount || 0), notes: ownerDrawForm.notes });
      setOwnerDrawForm({ ...ownerDrawForm, amount: "0" });
      setCashModal(null);
      await onRefresh();
      onMessage("Ambil profit owner berhasil dicatat");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitBankFee(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await bankFee({ account_id: Number(bankFeeForm.account_id), amount: Number(bankFeeForm.amount || 0), notes: bankFeeForm.notes });
      setBankFeeForm({ ...bankFeeForm, amount: "0" });
      setCashModal(null);
      await onRefresh();
      onMessage("Potongan bank/QRIS berhasil dicatat");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return {
    cashModal,
    setCashModal,
    accountForm,
    setAccountForm,
    adjustForm,
    setAdjustForm,
    transferForm,
    setTransferForm,
    ownerDrawForm,
    setOwnerDrawForm,
    bankFeeForm,
    setBankFeeForm,
    openAddAccount,
    openTransfer,
    openAdjust,
    openOwnerDraw,
    openBankFee,
    submitAccount,
    submitAdjustment,
    submitTransfer,
    submitOwnerDraw,
    submitBankFee,
  };
}
