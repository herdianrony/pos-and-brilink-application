import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle, MessageCircle, Plus, ReceiptText, WalletCards } from "lucide-react";
import type { DebtRow } from "../api";
import { CurrencyInput } from "../components/CurrencyInput";
import { formatRupiah } from "../lib/format";

type DebtFilter = "open" | "paid" | "all";

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
  const [filter, setFilter] = useState<DebtFilter>("open");
  const openDebts = debts.filter((debt) => debt.status !== "paid");
  const paidDebts = debts.filter((debt) => debt.status === "paid");
  const visibleDebts = useMemo(() => {
    if (filter === "open") return openDebts;
    if (filter === "paid") return paidDebts;
    return debts;
  }, [debts, filter, openDebts, paidDebts]);
  const totalOutstanding = openDebts.reduce((sum, debt) => sum + debt.outstanding, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.paid_amount, 0);

  return (
    <div className="debt-page">
      <div className="page-title debt-title">
        <div>
          <p className="eyebrow">Piutang Pelanggan</p>
          <h1>Buku Utang</h1>
          <p>Catat utang, cicilan, dan salin pengingat WhatsApp untuk pelanggan.</p>
        </div>
      </div>

      <section className="electron-stat-grid debt-stat-grid">
        <div className="electron-stat-card"><span className="stat-icon amber"><ReceiptText size={20} /></span><div><small>Belum Lunas</small><strong>{formatRupiah(totalOutstanding)}</strong><p>{openDebts.length} pelanggan</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon blue"><WalletCards size={20} /></span><div><small>Total Utang</small><strong>{formatRupiah(totalDebt)}</strong><p>semua catatan</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon green"><CheckCircle size={20} /></span><div><small>Terbayar</small><strong>{formatRupiah(totalPaid)}</strong><p>{paidDebts.length} lunas</p></div></div>
      </section>

      <section className="history-filter-panel card debt-filter-panel">
        <div className="electron-tabs">
          <button className={filter === "open" ? "electron-tab active" : "electron-tab"} onClick={() => setFilter("open")}>Belum Lunas</button>
          <button className={filter === "paid" ? "electron-tab active" : "electron-tab"} onClick={() => setFilter("paid")}>Lunas</button>
          <button className={filter === "all" ? "electron-tab active" : "electron-tab"} onClick={() => setFilter("all")}>Semua</button>
        </div>
      </section>

      <section className="debt-layout">
        <div className="card debt-list-card">
          <div className="card-header"><div><h2>Daftar Utang</h2><p>{visibleDebts.length} catatan sesuai filter.</p></div></div>
          {visibleDebts.length === 0 ? <div className="empty-state"><strong>Belum ada data utang</strong><span>Catat utang pelanggan dari panel kanan.</span></div> : (
            <div className="debt-table-like">
              <div className="debt-table-head"><span>Pelanggan</span><span>Status</span><span>Sisa</span><span>Aksi</span></div>
              {visibleDebts.map((debt) => (
                <div key={debt.id} className="debt-table-row">
                  <div><strong>{debt.customer_name}</strong><small>{debt.phone || "Tanpa nomor"}</small><small>{debt.notes || "-"}</small></div>
                  <span className={debt.status === "paid" ? "history-status-badge completed" : "history-status-badge pending"}>{debt.status === "paid" ? "Lunas" : "Belum lunas"}</span>
                  <div className="amount-stack"><strong>{formatRupiah(debt.outstanding)}</strong><small>Total {formatRupiah(debt.amount)}</small></div>
                  <div className="debt-actions">
                    <button className="secondary" onClick={() => onDebtPaymentFormChange({ ...debtPaymentForm, debt_id: String(debt.id) })} disabled={debt.status === "paid"}><Plus size={14} /> Bayar</button>
                    <button className="secondary" onClick={() => onCopyReminder(debt)} disabled={debt.status === "paid"}><MessageCircle size={14} /> Reminder</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="debt-form-stack">
          <div className="card">
            <div className="card-header"><div><h2>Tambah Utang</h2><p>Gunakan saat pelanggan belum membayar.</p></div></div>
            <form onSubmit={onSubmitDebt} className="product-form no-box">
              <label>Nama Pelanggan<input value={debtForm.customer_name} onChange={(e) => onDebtFormChange({ ...debtForm, customer_name: e.target.value })} /></label>
              <label>No WhatsApp<input value={debtForm.phone} onChange={(e) => onDebtFormChange({ ...debtForm, phone: e.target.value })} placeholder="628xxxx" /></label>
              <label>Nominal Utang<CurrencyInput value={debtForm.amount} onChange={(value) => onDebtFormChange({ ...debtForm, amount: value })} /></label>
              <label>Catatan<input value={debtForm.notes} onChange={(e) => onDebtFormChange({ ...debtForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving}>Simpan Utang</button>
            </form>
          </div>

          <div className="card">
            <div className="card-header"><div><h2>Catat Pembayaran</h2><p>Catat cicilan atau pelunasan utang.</p></div></div>
            <form onSubmit={onSubmitDebtPayment} className="product-form no-box">
              <label>Pelanggan<select value={debtPaymentForm.debt_id} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, debt_id: e.target.value })}>
                <option value="">Pilih utang</option>
                {openDebts.map((debt) => <option key={debt.id} value={debt.id}>{debt.customer_name} — {formatRupiah(debt.outstanding)}</option>)}
              </select></label>
              <label>Nominal Bayar<CurrencyInput value={debtPaymentForm.amount} onChange={(value) => onDebtPaymentFormChange({ ...debtPaymentForm, amount: value })} /></label>
              <label className="span-2">Catatan<input value={debtPaymentForm.notes} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving || !debtPaymentForm.debt_id}>Simpan Pembayaran</button>
            </form>
          </div>
        </aside>
      </section>
    </div>
  );
}
