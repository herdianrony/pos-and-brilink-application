import { useMemo, useState } from "react";
import { Ban, CheckCircle, ClipboardList, Landmark, RotateCcw, ShoppingCart } from "lucide-react";
import type { TransactionItemRow, TransactionRow } from "../api";
import { formatRupiah, paymentLabel } from "../lib/format";
import { Card, DataCell, DataCellText, DataRow, DataTable, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";

const typeTabs = [
  { id: "all", label: "Semua", icon: ClipboardList },
  { id: "pos", label: "POS", icon: ShoppingCart },
  { id: "agent", label: "Layanan", icon: Landmark },
] as const;

const statusTabs = [
  { id: "all", label: "Semua Status" },
  { id: "completed", label: "Selesai" },
  { id: "pending", label: "Pending" },
  { id: "void", label: "Batal" },
] as const;


function statusClass(status: string) {
  const tone = status === "completed" ? "bg-emerald-50 text-emerald-700" : status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600";
  return `inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-black ${tone}`;
}

function statusLabel(status: string) {
  if (status === "completed") return "Selesai";
  if (status === "pending") return "Pending";
  if (status === "void") return "Batal";
  if (status === "reversed") return "Reverse";
  return status;
}

export function HistoryPage({
  transactions,
  selectedTransaction,
  selectedTransactionItems,
  onOpenDetail,
}: {
  transactions: TransactionRow[];
  selectedTransaction: TransactionRow | null;
  selectedTransactionItems: TransactionItemRow[];
  onOpenDetail: (transaction: TransactionRow) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<(typeof typeTabs)[number]["id"]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusTabs)[number]["id"]>("all");

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      const typeMatches = typeFilter === "all" || transaction.transaction_type === typeFilter;
      const statusMatches = statusFilter === "all" || transaction.status === statusFilter;
      return typeMatches && statusMatches;
    });
  }, [statusFilter, transactions, typeFilter]);

  const revenue = filtered.reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const profit = filtered.reduce((sum, transaction) => sum + transaction.profit, 0);
  const pendingCount = transactions.filter((transaction) => transaction.status === "pending").length;

  return (
    <div className="grid gap-4">
      <PageHeader
        title={<span className="flex items-center gap-2"><ClipboardList size={26} /> Riwayat Transaksi</span>}
        description={`${filtered.length} transaksi ditemukan${pendingCount > 0 ? ` • ${pendingCount} pending` : ""}`}
      />

      <section className="mb-4 grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1 mb-0">
        <StatCard tone="blue" icon={<ClipboardList size={20} />} label="Total Transaksi" value={filtered.length} sub="sesuai filter" />
        <StatCard tone="green" icon={<CheckCircle size={20} />} label="Total Omzet" value={formatRupiah(revenue)} sub="nilai transaksi" />
        <StatCard tone="amber" icon={<RotateCcw size={20} />} label="Profit" value={formatRupiah(profit)} sub="estimasi keuntungan" />
        <StatCard tone="teal" icon={<Ban size={20} />} label="Pending" value={pendingCount} sub="perlu diproses" />
      </section>

      <Card className="mb-4 grid gap-3 p-3">
        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.id} className={typeFilter === tab.id ? "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none"} onClick={() => setTypeFilter(tab.id)}>
                <TabIcon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {statusTabs.map((tab) => (
            <button key={tab.id} className={statusFilter === tab.id ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100"} onClick={() => setStatusFilter(tab.id)}>{tab.label}</button>
          ))}
        </div>
      </Card>

      <section className="grid grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)] items-start gap-4 max-[1080px]:grid-cols-1">
        <SectionCard className="min-w-0 rounded-[28px]" title="Daftar Transaksi" description="Klik salah satu transaksi untuk melihat detail.">
          {filtered.length === 0 ? <EmptyState title="Belum ada transaksi" description="Transaksi akan muncul setelah kasir atau layanan agen digunakan." /> : (
            <DataTable columns={["Invoice", "Tipe", "Status", "Total"]} template="minmax(0,1.4fr) 120px 110px 130px">
              {filtered.map((transaction) => (
                <DataRow key={transaction.id} template="minmax(0,1.4fr) 120px 110px 130px" active={selectedTransaction?.id === transaction.id} onClick={() => onOpenDetail(transaction)}>
                  <DataCell><strong>{transaction.invoice_no}</strong><DataCellText>{transaction.created_at}</DataCellText></DataCell>
                  <DataCell>{transaction.transaction_type === "pos" ? "POS" : "Layanan"}<DataCellText>{paymentLabel(transaction.payment_method)}</DataCellText></DataCell>
                  <span className={statusClass(transaction.status)}>{statusLabel(transaction.status)}</span>
                  <strong>{formatRupiah(transaction.total_amount)}</strong>
                </DataRow>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard className="rounded-[28px]" title="Detail Transaksi" description="Ringkasan dan item transaksi.">
          {!selectedTransaction ? <EmptyState compact title="Pilih transaksi" description="Detail akan tampil di sini." /> : (
            <div className="grid gap-2.5">
              <div className="grid gap-2 break-all rounded-[18px] border border-slate-200 bg-slate-50 p-4"><strong>{selectedTransaction.invoice_no}</strong><span>{selectedTransaction.created_at}</span></div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3"><span>Tipe</span><strong>{selectedTransaction.transaction_type === "pos" ? "POS" : "Layanan Agen"}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3"><span>Metode</span><strong>{paymentLabel(selectedTransaction.payment_method)}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3"><span>Status</span><strong>{statusLabel(selectedTransaction.status)}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3"><span>Total</span><strong>{formatRupiah(selectedTransaction.total_amount)}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3"><span>Profit</span><strong>{formatRupiah(selectedTransaction.profit)}</strong></div>
              <h2>Item</h2>
              {selectedTransactionItems.length === 0 ? <p>Belum ada item detail.</p> : selectedTransactionItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block">
                  <div><strong>{item.product_name}</strong><small>{item.quantity} x {formatRupiah(item.unit_price)}</small></div>
                  <strong>{formatRupiah(item.subtotal)}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
