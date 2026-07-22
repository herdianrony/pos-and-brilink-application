import type { FormEvent } from "react";
import type { AccountRow } from "../api";
import { CurrencyInput } from "./CurrencyInput";
import { Button, CardHeader } from "./ui";

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
    <div className="absolute inset-0 z-[80] grid min-h-[calc(100vh-64px)] place-items-center bg-slate-900/55 p-6 print:bg-white print:p-0">
      <section className="max-h-[calc(100vh-48px)] w-[min(780px,100%)] overflow-auto rounded-3xl bg-white p-5.5 shadow-[0_30px_90px_rgba(15,23,42,.35)]" role="dialog" aria-modal="true" aria-label="Dialog Kas dan Saldo">
        <CardHeader>
          <div><p className="m-0 mb-2 text-xs font-black uppercase tracking-[0.14em] text-primary">Kas & Saldo</p><h2>{title}</h2></div>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </CardHeader>
        {cashModal === "account" && (
          <form onSubmit={onSubmitAccount} className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1 [&_button]:col-span-full">
            <label className="grid gap-2 text-sm font-black text-slate-600">Kode<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={accountForm.code} onChange={(e) => onAccountFormChange({ ...accountForm, code: e.target.value })} placeholder="bri / bca / qris" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Nama<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={accountForm.name} onChange={(e) => onAccountFormChange({ ...accountForm, name: e.target.value })} placeholder="Rekening BRI" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Saldo Awal<CurrencyInput value={accountForm.initial_balance} onChange={(value) => onAccountFormChange({ ...accountForm, initial_balance: value })} /></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Saldo Minimum<CurrencyInput value={accountForm.min_balance} onChange={(value) => onAccountFormChange({ ...accountForm, min_balance: value })} /></label>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden col-span-full md:col-span-2"><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving}>Tambah Rekening</Button></div>
          </form>
        )}
        {cashModal === "adjust" && (
          <form onSubmit={onSubmitAdjustment} className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1 [&_button]:col-span-full">
            <label className="grid gap-2 text-sm font-black text-slate-600">Rekening<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={adjustForm.account_id} onChange={(e) => onAdjustFormChange({ ...adjustForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Nominal (+ / -)<CurrencyInput allowNegative value={adjustForm.amount} onChange={(value) => onAdjustFormChange({ ...adjustForm, amount: value })} /></label>
            <label className="grid gap-2 text-sm font-black text-slate-600 col-span-full md:col-span-2">Catatan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={adjustForm.notes} onChange={(e) => onAdjustFormChange({ ...adjustForm, notes: e.target.value })} /></label>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden col-span-full md:col-span-2"><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !adjustForm.account_id}>Simpan</Button></div>
          </form>
        )}
        {cashModal === "transfer" && (
          <form onSubmit={onSubmitTransfer} className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1 [&_button]:col-span-full">
            <label className="grid gap-2 text-sm font-black text-slate-600">Dari<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={transferForm.from_account_id} onChange={(e) => onTransferFormChange({ ...transferForm, from_account_id: e.target.value })}><option value="">Pilih asal</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Ke<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={transferForm.to_account_id} onChange={(e) => onTransferFormChange({ ...transferForm, to_account_id: e.target.value })}><option value="">Pilih tujuan</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Nominal<CurrencyInput value={transferForm.amount} onChange={(value) => onTransferFormChange({ ...transferForm, amount: value })} /></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Catatan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={transferForm.notes} onChange={(e) => onTransferFormChange({ ...transferForm, notes: e.target.value })} /></label>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden col-span-full md:col-span-2"><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !transferForm.from_account_id || !transferForm.to_account_id}>Transfer</Button></div>
          </form>
        )}
        {cashModal === "ownerDraw" && (
          <form onSubmit={onSubmitOwnerDraw} className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1 [&_button]:col-span-full">
            <label className="grid gap-2 text-sm font-black text-slate-600">Rekening<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={ownerDrawForm.account_id} onChange={(e) => onOwnerDrawFormChange({ ...ownerDrawForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Nominal<CurrencyInput value={ownerDrawForm.amount} onChange={(value) => onOwnerDrawFormChange({ ...ownerDrawForm, amount: value })} /></label>
            <label className="grid gap-2 text-sm font-black text-slate-600 col-span-full md:col-span-2">Catatan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={ownerDrawForm.notes} onChange={(e) => onOwnerDrawFormChange({ ...ownerDrawForm, notes: e.target.value })} /></label>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden col-span-full md:col-span-2"><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !ownerDrawForm.account_id}>Catat Ambil Uang</Button></div>
          </form>
        )}
        {cashModal === "bankFee" && (
          <form onSubmit={onSubmitBankFee} className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1 [&_button]:col-span-full">
            <label className="grid gap-2 text-sm font-black text-slate-600">Rekening<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={bankFeeForm.account_id} onChange={(e) => onBankFeeFormChange({ ...bankFeeForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-black text-slate-600">Nominal<CurrencyInput value={bankFeeForm.amount} onChange={(value) => onBankFeeFormChange({ ...bankFeeForm, amount: value })} /></label>
            <label className="grid gap-2 text-sm font-black text-slate-600 col-span-full md:col-span-2">Catatan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={bankFeeForm.notes} onChange={(e) => onBankFeeFormChange({ ...bankFeeForm, notes: e.target.value })} /></label>
            <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden col-span-full md:col-span-2"><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving || !bankFeeForm.account_id}>Catat Potongan</Button></div>
          </form>
        )}
      </section>
    </div>
  );
}
