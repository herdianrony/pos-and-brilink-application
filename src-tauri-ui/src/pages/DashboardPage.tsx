import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { Icon } from "../components/AppIcon";
import { formatRupiah, paymentLabel } from "../lib/format";
import type { ViewKey } from "../types";

export function DashboardPage({
  accounts,
  products,
  transactions,
  totalCash,
  lowStockCount,
  cartTotal,
  cartCount,
  loading,
  onNavigate,
  onRefresh,
}: {
  accounts: AccountRow[];
  products: ProductRow[];
  transactions: TransactionRow[];
  totalCash: number;
  lowStockCount: number;
  cartTotal: number;
  cartCount: number;
  loading: boolean;
  onNavigate: (view: ViewKey) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <div className="hero-panel">
        <div>
          <p className="eyebrow">CatatAgen Local</p>
          <h1>Dashboard Operasional</h1>
          <p>POS retail, layanan agen non-API, saldo virtual, dan buku utang dalam satu aplikasi ringan.</p>
        </div>
        <div className="hero-actions">
          <button onClick={() => onNavigate("pos")}>Buka Kasir</button>
          <button className="secondary" onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
        </div>
      </div>
      <section className="stat-grid">
        <div className="stat-card green"><span>Saldo Kas</span><strong>{formatRupiah(totalCash)}</strong><small>Total saldo akun aktif</small></div>
        <div className="stat-card blue"><span>Produk</span><strong>{products.length}</strong><small>{lowStockCount} stok menipis</small></div>
        <div className="stat-card amber"><span>Transaksi</span><strong>{transactions.length}</strong><small>Riwayat transaksi tersimpan</small></div>
        <div className="stat-card purple"><span>Keranjang</span><strong>{formatRupiah(cartTotal)}</strong><small>{cartCount} item siap checkout</small></div>
      </section>
      <section className="quick-launch-grid">
        <button onClick={() => onNavigate("pos")} className="launch-card"><Icon name="pos" /><strong>Kasir POS</strong><span>Jual barang fisik</span></button>
        <button onClick={() => onNavigate("brilink")} className="launch-card"><Icon name="brilink" /><strong>Layanan Agen</strong><span>Catat transaksi non-API</span></button>
        <button onClick={() => onNavigate("debts")} className="launch-card"><Icon name="debts" /><strong>Buku Utang</strong><span>Piutang & reminder</span></button>
        <button onClick={() => onNavigate("cash")} className="launch-card"><Icon name="cash" /><strong>Kas & Saldo</strong><span>Saldo virtual</span></button>
      </section>
      <section className="grid dashboard-grid">
        <div className="card">
          <div className="card-header"><div><h2>Transaksi Terakhir</h2><p>Aktivitas POS dan layanan agen terbaru.</p></div></div>
          {transactions.length === 0 ? <div className="empty-state"><strong>Belum ada transaksi</strong><span>Mulai dari Kasir POS atau Layanan Agen.</span></div> : transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="row rich-row">
              <div><strong>{transaction.invoice_no}</strong><small>{paymentLabel(transaction.payment_method)} • {transaction.status}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><div><h2>Perlu Perhatian</h2><p>Stok menipis dan posisi saldo.</p></div></div>
          {products.filter((product) => product.stock <= product.min_stock).slice(0, 4).map((product) => (
            <div key={product.id} className="row rich-row warning-row"><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><span className="status-badge warning">Stok rendah</span></div>
          ))}
          {lowStockCount === 0 && <div className="empty-state compact"><strong>Stok aman</strong><span>Tidak ada produk di bawah minimum.</span></div>}
          <div className="divider" />
          {accounts.slice(0, 3).map((account) => (
            <div key={account.id} className="row rich-row">
              <div><strong>{account.name}</strong><small>{account.code}</small></div>
              <strong>{formatRupiah(account.balance)}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
