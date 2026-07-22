import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle, HandCoins, MessageCircle, ReceiptText, WalletCards } from "lucide-react";
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
    <div className="grid gap-4">
      <PageHeader eyebrow="Piutang Pelanggan" title="Buku Utang" description="Catat utang, cicilan, dan salin pengingat WhatsApp untuk pelanggan." />

      <section className="mb-4 grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1 mb-0">
        <StatCard color="amber" icon={<ReceiptText size={20} />} label="Belum Lunas" value={formatRupiah(totalOutstanding)} sub={`${openDebts.length} pelanggan`} />
        <StatCard color="blue" icon={<WalletCards size={20} />} label="Total Utang" value={formatRupiah(totalDebt)} sub="semua catatan" />
        <StatCard color="green" icon={<CheckCircle size={20} />} label="Terbayar" value={formatRupiah(totalPaid)} sub={`${paidDebts.length} lunas`} />
      </section>

      <Card className="mb-4 grid gap-3 p-3 p-3">
        <div className="flex flex-wrap gap-2">
          <button className={filter === "open" ? "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none"} onClick={() => setFilter("open")}>Belum Lunas</button>
          <button className={filter === "paid" ? "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none"} onClick={() => setFilter("paid")}>Lunas</button>
          <button className={filter === "all" ? "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none"} onClick={() => setFilter("all")}>Semua</button>
        </div>
      </Card>

      <section className="grid grid-cols-[minmax(0,1.35fr)_minmax(360px,.8fr)] items-start gap-[18px] max-[1080px]:grid-cols-1">
        <SectionCard className="rounded-[28px]" title="Daftar Utang" description={`${visibleDebts.length} catatan sesuai filter.`}>
          {visibleDebts.length === 0 ? <EmptyState title="Belum ada data utang" description="Catat utang pelanggan dari panel kanan." /> : (
            <DataTable columns={["Pelanggan", "Status", "Sisa", "Aksi"]} template="minmax(0,1.2fr) 110px 130px 104px" minWidth={640}>
              {visibleDebts.map((debt) => (
                <DataRow key={debt.id} template="minmax(0,1.2fr) 110px 130px 104px">
                  <DataCell><strong>{debt.customer_name}</strong><DataCellText>{debt.phone || "Tanpa nomor"}</DataCellText><DataCellText>{debt.notes || "-"}</DataCellText></DataCell>
                  <span className={debt.status === "paid" ? "inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-black bg-emerald-50 text-emerald-700" : "inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-black bg-amber-50 text-amber-700"}>{debt.status === "paid" ? "Lunas" : "Belum lunas"}</span>
                  <div className="grid justify-items-end gap-1 text-right"><strong>{formatRupiah(debt.outstanding)}</strong><small>Total {formatRupiah(debt.amount)}</small></div>
                  <div className="flex flex-wrap gap-2 lg:justify-end [&_button]:px-3 [&_button]:py-2 [&_button]:text-xs">
                    <Button variant="secondary" className="h-10 w-10 p-0" title="Catat pembayaran" aria-label={`Catat pembayaran utang ${debt.customer_name}`} onClick={() => onDebtPaymentFormChange({ ...debtPaymentForm, debt_id: String(debt.id) })} disabled={debt.status === "paid"}><HandCoins size={16} /></Button>
                    <Button variant="secondary" className="h-10 w-10 p-0" title="Salin reminder" aria-label={`Salin reminder utang ${debt.customer_name}`} onClick={() => onCopyReminder(debt)} disabled={debt.status === "paid"}><MessageCircle size={16} /></Button>
                  </div>
                </DataRow>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <aside className="grid gap-4 xl:sticky xl:top-24 [&>div]:rounded-[28px]">
          <SectionCard title="Tambah Utang" description="Gunakan saat pelanggan belum membayar.">
            <form onSubmit={onSubmitDebt} className="mb-5 grid grid-cols-2 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[640px]:grid-cols-1 [&_button]:col-span-full border-0 bg-transparent p-0">
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Nama Pelanggan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={debtForm.customer_name} onChange={(e) => onDebtFormChange({ ...debtForm, customer_name: e.target.value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">No WhatsApp<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={debtForm.phone} onChange={(e) => onDebtFormChange({ ...debtForm, phone: e.target.value })} placeholder="628xxxx" /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Nominal Utang<CurrencyInput value={debtForm.amount} onChange={(value) => onDebtFormChange({ ...debtForm, amount: value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Catatan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={debtForm.notes} onChange={(e) => onDebtFormChange({ ...debtForm, notes: e.target.value })} /></label>
              <Button type="submit" disabled={saving}>Simpan Utang</Button>
            </form>
          </SectionCard>

          <SectionCard title="Catat Pembayaran" description="Catat cicilan atau pelunasan utang.">
            <form onSubmit={onSubmitDebtPayment} className="mb-5 grid grid-cols-2 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[640px]:grid-cols-1 [&_button]:col-span-full border-0 bg-transparent p-0">
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Pelanggan<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={debtPaymentForm.debt_id} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, debt_id: e.target.value })}>
                <option value="">Pilih utang</option>
                {openDebts.map((debt) => <option key={debt.id} value={debt.id}>{debt.customer_name} — {formatRupiah(debt.outstanding)}</option>)}
              </select></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Nominal Bayar<CurrencyInput value={debtPaymentForm.amount} onChange={(value) => onDebtPaymentFormChange({ ...debtPaymentForm, amount: value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600 col-span-full md:col-span-2">Catatan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={debtPaymentForm.notes} onChange={(e) => onDebtPaymentFormChange({ ...debtPaymentForm, notes: e.target.value })} /></label>
              <Button type="submit" disabled={saving || !debtPaymentForm.debt_id}>Simpan Pembayaran</Button>
            </form>
          </SectionCard>
        </aside>
      </section>
    </div>
  );
}
