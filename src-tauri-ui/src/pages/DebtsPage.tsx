import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle, MessageCircle, Plus, ReceiptText, WalletCards } from "lucide-react";
import type { DebtRow } from "../api";
import { CurrencyInput } from "../components/CurrencyInput";
import { Card, Button, DataCell, DataCellText, DataRow, DataTable, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
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
      <PageHeader eyebrow="Piutang Pelanggan" title="Buku Utang" description="Catat utang, cicilan, dan salin pengingat WhatsApp untuk pelanggan." />

      <section className="electron-stat-grid debt-stat-grid">
        <StatCard tone="amber" icon={<ReceiptText size={20} />} label="Belum Lunas" value={formatRupiah(totalOutstanding)} sub={`${openDebts.length} pelanggan`} />
        <StatCard tone="blue" icon={<WalletCards size={20} />} label="Total Utang" value={formatRupiah(totalDebt)} sub="semua catatan" />
        <StatCard tone="green" icon={<CheckCircle size={20} />} label="Terbayar" value={formatRupiah(totalPaid)} sub={`${paidDebts.length} lunas`} />
      </section>

      <Card className="history-filter-panel debt-filter-panel">
        <div className="electron-tabs">
          <button className={filter === "open" ? "electron-tab active" : "electron-tab"} onClick={() => setFilter("open")}>Belum Lunas</button>
          <button className={filter === "paid" ? "electron-tab active" : "electron-tab"} onClick={() => setFilter("paid")}>Lunas</button>
          <button className={filter === "all" ? "electron-tab active" : "electron-tab"} onClick={() => setFilter("all")}>Semua</button>
        </div>
      </Card>

      <section className="debt-layout">
        <SectionCard className="debt-list-card" title="Daftar Utang" description={`${visibleDebts.length} catatan sesuai filter.`}>
          {visibleDebts.length === 0 ? <EmptyState title="Belum ada data utang" description="Catat utang pelanggan dari panel kanan." /> : (
            <DataTable columns={["Pelanggan", "Status", "Sisa", "Aksi"]} template="minmax(0,1.2fr) 110px 130px 190px" minWidth={780}>
              {visibleDebts.map((debt) => (
                <DataRow key={debt.id} template="minmax(0,1.2fr) 110px 130px 190px">
                  <DataCell><strong>{debt.customer_name}</strong><DataCellText>{debt.phone || "Tanpa nomor"}</DataCellText><DataCellText>{debt.notes || "-"}</DataCellText></DataCell>
                  <span className={debt.status === "paid" ? "history-status-badge completed" : "history-status-badge pending"}>{debt.status === "paid" ? "Lunas" : "Belum lunas"}</span>
                  <div className="amount-stack"><strong>{formatRupiah(debt.outstanding)}</strong><small>Total {formatRupiah(debt.amount)}</small></div>
                  <div className="debt-actions">
                    <Button variant="secondary" onClick={() => onDebtPaymentFormChange({ ...debtPaymentForm, debt_id: String(debt.id) })} disabled={debt.status === "paid"}><Plus size={14} /> Bayar</Button>
                    <Button variant="secondary" onClick={() => onCopyReminder(debt)} disabled={debt.status === "paid"}><MessageCircle size={14} /> Reminder</Button>
                  </div>
                </DataRow>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <aside className="debt-form-stack">
          <SectionCard title="Tambah Utang" description="Gunakan saat pelanggan belum membayar.">
            <form onSubmit={onSubmitDebt} className="product-form no-box">
              <label>Nama Pelanggan<input value={debtForm.customer_name} onChange={(e) => onDebtFormChange({ ...debtForm, customer_name: e.target.value })} /></label>
              <label>No WhatsApp<input value={debtForm.phone} onChange={(e) => onDebtFormChange({ ...debtForm, phone: e.target.value })} placeholder="628xxxx" /></label>
              <label>Nominal Utang<CurrencyInput value={debtForm.amount} onChange={(value) => onDebtFormChange({ ...debtForm, amount: value })} /></label>
              <label>Catatan<input value={debtForm.notes} onChange={(e) => onDebtFormChange({ ...debtForm, notes: e.target.value })} /></label>
              <Button type="submit" disabled={saving}>Simpan Utang</Button>
            </form>
          </SectionCard>

          <SectionCard title="Catat Pembayaran" description="Catat cicilan atau pelunasan utang.">
            <form onSubmit={onSubmitDebtPayment} className="product-form no-box">
              <label>Pelanggan<select value={debtPaymentForm.debt_id} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, debt_id: e.target.value })}>
                <option value="">Pilih utang</option>
                {openDebts.map((debt) => <option key={debt.id} value={debt.id}>{debt.customer_name} — {formatRupiah(debt.outstanding)}</option>)}
              </select></label>
              <label>Nominal Bayar<CurrencyInput value={debtPaymentForm.amount} onChange={(value) => onDebtPaymentFormChange({ ...debtPaymentForm, amount: value })} /></label>
              <label className="span-2">Catatan<input value={debtPaymentForm.notes} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, notes: e.target.value })} /></label>
              <Button type="submit" disabled={saving || !debtPaymentForm.debt_id}>Simpan Pembayaran</Button>
            </form>
          </SectionCard>
        </aside>
      </section>
    </div>
  );
}
