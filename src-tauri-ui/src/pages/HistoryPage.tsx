import { useMemo, useState } from "react";
import { Ban, CheckCircle, ClipboardList, Landmark, RotateCcw, ShoppingCart } from "lucide-react";
import type { TransactionItemRow, TransactionRow } from "../api";
import { formatRupiah, paymentLabel } from "../lib/format";
import { Card, DataCell, DataCellText, DataRow, DataTable, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { tw } from "../lib/tw";

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
    <div className={tw("history-electron-page")}>
      <PageHeader
        title={<span className={tw("flex items-center gap-2")}><ClipboardList size={26} /> Riwayat Transaksi</span>}
        description={`${filtered.length} transaksi ditemukan${pendingCount > 0 ? ` • ${pendingCount} pending` : ""}`}
      />

      <section className={tw("electron-stat-grid history-stat-grid")}>
        <StatCard tone="blue" icon={<ClipboardList size={20} />} label="Total Transaksi" value={filtered.length} sub="sesuai filter" />
        <StatCard tone="green" icon={<CheckCircle size={20} />} label="Total Omzet" value={formatRupiah(revenue)} sub="nilai transaksi" />
        <StatCard tone="amber" icon={<RotateCcw size={20} />} label="Profit" value={formatRupiah(profit)} sub="estimasi keuntungan" />
        <StatCard tone="purple" icon={<Ban size={20} />} label="Pending" value={pendingCount} sub="perlu diproses" />
      </section>

      <Card className={tw("history-filter-panel")}>
        <div className={tw("electron-tabs")}>
          {typeTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.id} className={tw(typeFilter === tab.id ? "electron-tab active" : "electron-tab")} onClick={() => setTypeFilter(tab.id)}>
                <TabIcon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
        <div className={tw("status-filter-row")}>
          {statusTabs.map((tab) => (
            <button key={tab.id} className={tw(statusFilter === tab.id ? "filter-chip active" : "filter-chip")} onClick={() => setStatusFilter(tab.id)}>{tab.label}</button>
          ))}
        </div>
      </Card>

      <section className={tw("history-layout")}>
        <SectionCard className={tw("history-table-card")} title="Daftar Transaksi" description="Klik salah satu transaksi untuk melihat detail.">
          {filtered.length === 0 ? <EmptyState title="Belum ada transaksi" description="Transaksi akan muncul setelah kasir atau layanan agen digunakan." /> : (
            <DataTable columns={["Invoice", "Tipe", "Status", "Total"]} template="minmax(0,1.4fr) 120px 110px 130px">
              {filtered.map((transaction) => (
                <DataRow key={transaction.id} template="minmax(0,1.4fr) 120px 110px 130px" active={selectedTransaction?.id === transaction.id} onClick={() => onOpenDetail(transaction)}>
                  <DataCell><strong>{transaction.invoice_no}</strong><DataCellText>{transaction.created_at}</DataCellText></DataCell>
                  <DataCell>{transaction.transaction_type === "pos" ? "POS" : "Layanan"}<DataCellText>{paymentLabel(transaction.payment_method)}</DataCellText></DataCell>
                  <span className={tw(`history-status-badge ${transaction.status}`)}>{statusLabel(transaction.status)}</span>
                  <strong>{formatRupiah(transaction.total_amount)}</strong>
                </DataRow>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard className={tw("transaction-detail-card")} title="Detail Transaksi" description="Ringkasan dan item transaksi.">
          {!selectedTransaction ? <EmptyState compact title="Pilih transaksi" description="Detail akan tampil di sini." /> : (
            <div className={tw("detail-panel")}>
              <div className={tw("db-box")}><strong>{selectedTransaction.invoice_no}</strong><span>{selectedTransaction.created_at}</span></div>
              <div className={tw("row")}><span>Tipe</span><strong>{selectedTransaction.transaction_type === "pos" ? "POS" : "Layanan Agen"}</strong></div>
              <div className={tw("row")}><span>Metode</span><strong>{paymentLabel(selectedTransaction.payment_method)}</strong></div>
              <div className={tw("row")}><span>Status</span><strong>{statusLabel(selectedTransaction.status)}</strong></div>
              <div className={tw("row")}><span>Total</span><strong>{formatRupiah(selectedTransaction.total_amount)}</strong></div>
              <div className={tw("row")}><span>Profit</span><strong>{formatRupiah(selectedTransaction.profit)}</strong></div>
              <h2>Item</h2>
              {selectedTransactionItems.length === 0 ? <p>Belum ada item detail.</p> : selectedTransactionItems.map((item) => (
                <div key={item.id} className={tw("row rich-row")}>
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
