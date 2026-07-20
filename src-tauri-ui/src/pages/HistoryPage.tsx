import type { TransactionItemRow, TransactionRow } from "../api";
import { formatRupiah, paymentLabel } from "../lib/format";

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
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Audit</p><h1>Riwayat Transaksi</h1></div></div>
      <div className="page-help"><strong>Cara pakai:</strong><span>Klik transaksi di kiri untuk melihat detail item di kanan.</span></div>
      <section className="grid workspace-grid">
        <div className="card history-card">
          <h2>Daftar Transaksi</h2>
          {transactions.length === 0 ? <p>Belum ada transaksi.</p> : (
            <div className="history-list">
              {transactions.map((transaction) => (
                <button key={transaction.id} className="history-row clickable-row" onClick={() => onOpenDetail(transaction)}>
                  <div><strong>{transaction.invoice_no}</strong><small>{transaction.transaction_type.toUpperCase()} • {paymentLabel(transaction.payment_method)} • {transaction.status}</small></div>
                  <div className="right history-amount"><span>{transaction.created_at}</span><strong>{formatRupiah(transaction.total_amount)}</strong></div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2>Detail Transaksi</h2>
          {!selectedTransaction ? <p>Pilih transaksi untuk melihat detail.</p> : (
            <div className="detail-panel">
              <div className="db-box"><strong>{selectedTransaction.invoice_no}</strong><span>{selectedTransaction.created_at}</span></div>
              <div className="row"><span>Metode</span><strong>{paymentLabel(selectedTransaction.payment_method)}</strong></div>
              <div className="row"><span>Status</span><strong>{selectedTransaction.status}</strong></div>
              <div className="row"><span>Total</span><strong>{formatRupiah(selectedTransaction.total_amount)}</strong></div>
              <h2>Item</h2>
              {selectedTransactionItems.length === 0 ? <p>Belum ada item detail.</p> : selectedTransactionItems.map((item) => (
                <div key={item.id} className="row rich-row">
                  <div><strong>{item.product_name}</strong><small>{item.quantity} x {formatRupiah(item.unit_price)}</small></div>
                  <strong>{formatRupiah(item.subtotal)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
