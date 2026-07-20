import type { FormEvent } from "react";
import type { DebtRow } from "../api";
import { CurrencyInput } from "../components/CurrencyInput";
import { formatRupiah } from "../lib/format";

export function DebtsPage({
  debts,
  debtForm,
  debtPaymentForm,
  saving,
  onDebtFormChange,
  onDebtPaymentFormChange,
  onSubmitDebt,
  onSubmitDebtPayment,
  onCopyReminder,
}: {
  debts: DebtRow[];
  debtForm: { customer_name: string; phone: string; amount: string; notes: string };
  debtPaymentForm: { debt_id: string; amount: string; notes: string };
  saving: boolean;
  onDebtFormChange: (form: { customer_name: string; phone: string; amount: string; notes: string }) => void;
  onDebtPaymentFormChange: (form: { debt_id: string; amount: string; notes: string }) => void;
  onSubmitDebt: (event: FormEvent) => void;
  onSubmitDebtPayment: (event: FormEvent) => void;
  onCopyReminder: (debt: DebtRow) => void;
}) {
  const openDebts = debts.filter((debt) => debt.status !== "paid");
  const totalOutstanding = openDebts.reduce((sum, debt) => sum + debt.outstanding, 0);
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Piutang</p><h1>Buku Utang</h1></div><div className="total-row mini-total"><span>Total Belum Lunas</span><strong>{formatRupiah(totalOutstanding)}</strong></div></div>
      <div className="page-help"><strong>Alur utang:</strong><span>Catat utang saat pelanggan belum bayar.</span><span>Catat cicilan saat pelanggan membayar.</span><span>Salin reminder untuk kirim via WhatsApp.</span></div>
      <section className="grid workspace-grid">
        <div className="card">
          <h2>Tambah Utang Pelanggan</h2>
          <form onSubmit={onSubmitDebt} className="product-form">
            <label>Nama Pelanggan<input value={debtForm.customer_name} onChange={(e) => onDebtFormChange({ ...debtForm, customer_name: e.target.value })} /></label>
            <label>No WhatsApp<input value={debtForm.phone} onChange={(e) => onDebtFormChange({ ...debtForm, phone: e.target.value })} placeholder="628xxxx" /></label>
            <label>Nominal Utang<CurrencyInput value={debtForm.amount} onChange={(value) => onDebtFormChange({ ...debtForm, amount: value })} /></label>
            <label>Catatan<input value={debtForm.notes} onChange={(e) => onDebtFormChange({ ...debtForm, notes: e.target.value })} /></label>
            <button type="submit" disabled={saving}>Simpan Utang</button>
          </form>
          <h2>Catat Cicilan / Pelunasan</h2>
          <form onSubmit={onSubmitDebtPayment} className="product-form">
            <label>Pelanggan<select value={debtPaymentForm.debt_id} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, debt_id: e.target.value })}>
              <option value="">Pilih utang</option>
              {openDebts.map((debt) => <option key={debt.id} value={debt.id}>{debt.customer_name} — {formatRupiah(debt.outstanding)}</option>)}
            </select></label>
            <label>Nominal Bayar<CurrencyInput value={debtPaymentForm.amount} onChange={(value) => onDebtPaymentFormChange({ ...debtPaymentForm, amount: value })} /></label>
            <label className="span-2">Catatan<input value={debtPaymentForm.notes} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, notes: e.target.value })} /></label>
            <button type="submit" disabled={saving || !debtPaymentForm.debt_id}>Simpan Pembayaran</button>
          </form>
        </div>
        <div className="card">
          <h2>Daftar Utang</h2>
          {debts.length === 0 ? <div className="empty-state"><strong>Belum ada data utang</strong><span>Catat utang pelanggan atau ubah pencarian.</span></div> : debts.map((debt) => (
            <div key={debt.id} className="debt-row">
              <div><strong>{debt.customer_name}</strong><small>{debt.phone || "Tanpa nomor"} • {debt.status === "paid" ? "Lunas" : "Belum lunas"}</small><small>{debt.notes || "-"}</small></div>
              <div className="amount-stack"><strong>{formatRupiah(debt.outstanding)}</strong><small>Total {formatRupiah(debt.amount)}</small><button className="secondary" onClick={() => onCopyReminder(debt)} disabled={debt.status === "paid"}>Salin Reminder</button></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
