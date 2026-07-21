import type { FormEvent } from "react";
import type { AccountRow } from "../api";
import { CurrencyInput } from "./CurrencyInput";
import { Button, CardHeader } from "./ui";
import { tw } from "../lib/tw";

export type CashModalType = null | "account" | "adjust" | "transfer" | "ownerDraw" | "bankFee";

export function CashDialogs({
  cashModal,
  accounts,
  saving,
  accountForm,
  adjustForm,
  transferForm,
  ownerDrawForm,
  bankFeeForm,
  onClose,
  onAccountFormChange,
  onAdjustFormChange,
  onTransferFormChange,
  onOwnerDrawFormChange,
  onBankFeeFormChange,
  onSubmitAccount,
  onSubmitAdjustment,
  onSubmitTransfer,
  onSubmitOwnerDraw,
  onSubmitBankFee,
}: {
  cashModal: CashModalType;
  accounts: AccountRow[];
  saving: boolean;
  accountForm: { code: string; name: string; initial_balance: string; min_balance: string };
  adjustForm: { account_id: string; amount: string; notes: string };
  transferForm: { from_account_id: string; to_account_id: string; amount: string; notes: string };
  ownerDrawForm: { account_id: string; amount: string; notes: string };
  bankFeeForm: { account_id: string; amount: string; notes: string };
  onClose: () => void;
  onAccountFormChange: (form: { code: string; name: string; initial_balance: string; min_balance: string }) => void;
  onAdjustFormChange: (form: { account_id: string; amount: string; notes: string }) => void;
  onTransferFormChange: (form: { from_account_id: string; to_account_id: string; amount: string; notes: string }) => void;
  onOwnerDrawFormChange: (form: { account_id: string; amount: string; notes: string }) => void;
  onBankFeeFormChange: (form: { account_id: string; amount: string; notes: string }) => void;
  onSubmitAccount: (event: FormEvent) => void;
  onSubmitAdjustment: (event: FormEvent) => void;
  onSubmitTransfer: (event: FormEvent) => void;
  onSubmitOwnerDraw: (event: FormEvent) => void;
  onSubmitBankFee: (event: FormEvent) => void;
}) {
  if (!cashModal) return null;
  const title = cashModal === "account" ? "Tambah Rekening" : cashModal === "adjust" ? "Sesuaikan Saldo" : cashModal === "transfer" ? "Transfer Antar Rekening" : cashModal === "ownerDraw" ? "Ambil Uang Owner" : "Potongan Bank/QRIS";
  return (
    <div className={tw("modal-backdrop")}>
      <section className={tw("dialog-card product-dialog")} role="dialog" aria-modal="true" aria-label="Dialog Kas dan Saldo">
        <CardHeader>
          <div><p className={tw("eyebrow")}>Kas & Saldo</p><h2>{title}</h2></div>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </CardHeader>
        {cashModal === "account" && (
          <form onSubmit={onSubmitAccount} className={tw("dialog-form product-form no-box")}>
            <label className={tw("field-label")}>Kode<input className={tw("form-input")} value={accountForm.code} onChange={(e) => onAccountFormChange({ ...accountForm, code: e.target.value })} placeholder="bri / bca / qris" /></label>
            <label className={tw("field-label")}>Nama<input className={tw("form-input")} value={accountForm.name} onChange={(e) => onAccountFormChange({ ...accountForm, name: e.target.value })} placeholder="Rekening BRI" /></label>
            <label className={tw("field-label")}>Saldo Awal<CurrencyInput value={accountForm.initial_balance} onChange={(value) => onAccountFormChange({ ...accountForm, initial_balance: value })} /></label>
            <label className={tw("field-label")}>Saldo Minimum<CurrencyInput value={accountForm.min_balance} onChange={(value) => onAccountFormChange({ ...accountForm, min_balance: value })} /></label>
            <div className={tw("modal-actions span-2")}><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving}>Tambah Rekening</Button></div>
          </form>
        )}
        {cashModal === "adjust" && (
          <form onSubmit={onSubmitAdjustment} className={tw("dialog-form product-form no-box")}>
            <label className={tw("field-label")}>Rekening<select className={tw("form-input")} value={adjustForm.account_id} onChange={(e) => onAdjustFormChange({ ...adjustForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className={tw("field-label")}>Nominal (+ / -)<CurrencyInput allowNegative value={adjustForm.amount} onChange={(value) => onAdjustFormChange({ ...adjustForm, amount: value })} /></label>
            <label className={tw("field-label span-2")}>Catatan<input className={tw("form-input")} value={adjustForm.notes} onChange={(e) => onAdjustFormChange({ ...adjustForm, notes: e.target.value })} /></label>
            <div className={tw("modal-actions span-2")}><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !adjustForm.account_id}>Simpan</Button></div>
          </form>
        )}
        {cashModal === "transfer" && (
          <form onSubmit={onSubmitTransfer} className={tw("dialog-form product-form no-box")}>
            <label className={tw("field-label")}>Dari<select className={tw("form-input")} value={transferForm.from_account_id} onChange={(e) => onTransferFormChange({ ...transferForm, from_account_id: e.target.value })}><option value="">Pilih asal</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className={tw("field-label")}>Ke<select className={tw("form-input")} value={transferForm.to_account_id} onChange={(e) => onTransferFormChange({ ...transferForm, to_account_id: e.target.value })}><option value="">Pilih tujuan</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className={tw("field-label")}>Nominal<CurrencyInput value={transferForm.amount} onChange={(value) => onTransferFormChange({ ...transferForm, amount: value })} /></label>
            <label className={tw("field-label")}>Catatan<input className={tw("form-input")} value={transferForm.notes} onChange={(e) => onTransferFormChange({ ...transferForm, notes: e.target.value })} /></label>
            <div className={tw("modal-actions span-2")}><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !transferForm.from_account_id || !transferForm.to_account_id}>Transfer</Button></div>
          </form>
        )}
        {cashModal === "ownerDraw" && (
          <form onSubmit={onSubmitOwnerDraw} className={tw("dialog-form product-form no-box")}>
            <label className={tw("field-label")}>Rekening<select className={tw("form-input")} value={ownerDrawForm.account_id} onChange={(e) => onOwnerDrawFormChange({ ...ownerDrawForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className={tw("field-label")}>Nominal<CurrencyInput value={ownerDrawForm.amount} onChange={(value) => onOwnerDrawFormChange({ ...ownerDrawForm, amount: value })} /></label>
            <label className={tw("field-label span-2")}>Catatan<input className={tw("form-input")} value={ownerDrawForm.notes} onChange={(e) => onOwnerDrawFormChange({ ...ownerDrawForm, notes: e.target.value })} /></label>
            <div className={tw("modal-actions span-2")}><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !ownerDrawForm.account_id}>Catat Ambil Uang</Button></div>
          </form>
        )}
        {cashModal === "bankFee" && (
          <form onSubmit={onSubmitBankFee} className={tw("dialog-form product-form no-box")}>
            <label className={tw("field-label")}>Rekening<select className={tw("form-input")} value={bankFeeForm.account_id} onChange={(e) => onBankFeeFormChange({ ...bankFeeForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className={tw("field-label")}>Nominal<CurrencyInput value={bankFeeForm.amount} onChange={(value) => onBankFeeFormChange({ ...bankFeeForm, amount: value })} /></label>
            <label className={tw("field-label span-2")}>Catatan<input className={tw("form-input")} value={bankFeeForm.notes} onChange={(e) => onBankFeeFormChange({ ...bankFeeForm, notes: e.target.value })} /></label>
            <div className={tw("modal-actions span-2")}><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !bankFeeForm.account_id}>Catat Potongan</Button></div>
          </form>
        )}
      </section>
    </div>
  );
}
