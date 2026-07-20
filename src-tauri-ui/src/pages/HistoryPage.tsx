import { useMemo, useState } from "react";
import { Ban, CheckCircle, ClipboardList, Landmark, RotateCcw, ShoppingCart } from "lucide-react";
import type { TransactionItemRow, TransactionRow } from "../api";
import { formatRupiah, paymentLabel } from "../lib/format";

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
    <div className="history-electron-page">
      <div className="page-title history-title">
        <div>
          <h1><ClipboardList size={26} /> Riwayat Transaksi</h1>
          <p>{filtered.length} transaksi ditemukan{pendingCount > 0 ? ` • ${pendingCount} pending` : ""}</p>
        </div>
      </div>

      <section className="electron-stat-grid history-stat-grid">
        <div className="electron-stat-card"><span className="stat-icon blue"><ClipboardList size={20} /></span><div><small>Total Transaksi</small><strong>{filtered.length}</strong><p>sesuai filter</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon green"><CheckCircle size={20} /></span><div><small>Total Omzet</small><strong>{formatRupiah(revenue)}</strong><p>nilai transaksi</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon amber"><RotateCcw size={20} /></span><div><small>Profit</small><strong>{formatRupiah(profit)}</strong><p>estimasi keuntungan</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon purple"><Ban size={20} /></span><div><small>Pending</small><strong>{pendingCount}</strong><p>perlu diproses</p></div></div>
      </section>

      <section className="history-filter-panel card">
        <div className="electron-tabs">
          {typeTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.id} className={typeFilter === tab.id ? "electron-tab active" : "electron-tab"} onClick={() => setTypeFilter(tab.id)}>
                <TabIcon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
        <div className="status-filter-row">
          {statusTabs.map((tab) => (
            <button key={tab.id} className={statusFilter === tab.id ? "filter-chip active" : "filter-chip"} onClick={() => setStatusFilter(tab.id)}>{tab.label}</button>
          ))}
        </div>
      </section>

      <section className="history-layout">
        <div className="card history-table-card">
          <div className="card-header"><div><h2>Daftar Transaksi</h2><p>Klik salah satu transaksi untuk melihat detail.</p></div></div>
          {filtered.length === 0 ? <div className="empty-state"><strong>Belum ada transaksi</strong><span>Transaksi akan muncul setelah kasir atau layanan agen digunakan.</span></div> : (
            <div className="transaction-table-like">
              <div className="transaction-table-head"><span>Invoice</span><span>Tipe</span><span>Status</span><span>Total</span></div>
              {filtered.map((transaction) => (
                <button key={transaction.id} className={selectedTransaction?.id === transaction.id ? "transaction-row-like active" : "transaction-row-like"} onClick={() => onOpenDetail(transaction)}>
                  <span><strong>{transaction.invoice_no}</strong><small>{transaction.created_at}</small></span>
                  <span>{transaction.transaction_type === "pos" ? "POS" : "Layanan"}<small>{paymentLabel(transaction.payment_method)}</small></span>
                  <span className={`history-status-badge ${transaction.status}`}>{statusLabel(transaction.status)}</span>
                  <strong>{formatRupiah(transaction.total_amount)}</strong>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="card transaction-detail-card">
          <div className="card-header"><div><h2>Detail Transaksi</h2><p>Ringkasan dan item transaksi.</p></div></div>
          {!selectedTransaction ? <div className="empty-state compact"><strong>Pilih transaksi</strong><span>Detail akan tampil di sini.</span></div> : (
            <div className="detail-panel">
              <div className="db-box"><strong>{selectedTransaction.invoice_no}</strong><span>{selectedTransaction.created_at}</span></div>
              <div className="row"><span>Tipe</span><strong>{selectedTransaction.transaction_type === "pos" ? "POS" : "Layanan Agen"}</strong></div>
              <div className="row"><span>Metode</span><strong>{paymentLabel(selectedTransaction.payment_method)}</strong></div>
              <div className="row"><span>Status</span><strong>{statusLabel(selectedTransaction.status)}</strong></div>
              <div className="row"><span>Total</span><strong>{formatRupiah(selectedTransaction.total_amount)}</strong></div>
              <div className="row"><span>Profit</span><strong>{formatRupiah(selectedTransaction.profit)}</strong></div>
              <h2>Item</h2>
              {selectedTransactionItems.length === 0 ? <p>Belum ada item detail.</p> : selectedTransactionItems.map((item) => (
                <div key={item.id} className="row rich-row">
                  <div><strong>{item.product_name}</strong><small>{item.quantity} x {formatRupiah(item.unit_price)}</small></div>
                  <strong>{formatRupiah(item.subtotal)}</strong>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
