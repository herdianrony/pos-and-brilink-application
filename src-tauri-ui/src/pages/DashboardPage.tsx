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
  const posRevenue = transactions
    .filter((transaction) => transaction.transaction_type === "pos")
    .reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const agentRevenue = transactions
    .filter((transaction) => transaction.transaction_type === "agent")
    .reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const agentProfit = transactions
    .filter((transaction) => transaction.transaction_type === "agent")
    .reduce((sum, transaction) => sum + transaction.profit, 0);
  const totalRevenue = posRevenue + agentRevenue;
  const maxSummaryValue = Math.max(posRevenue, agentRevenue, agentProfit, 1);
  const paymentRows = ["cash", "transfer", "qris", "mixed"].map((method) => {
    const total = transactions
      .filter((transaction) => transaction.payment_method === method)
      .reduce((sum, transaction) => sum + transaction.total_amount, 0);
    return { method, total };
  }).filter((row) => row.total > 0);
  const maxPaymentValue = Math.max(...paymentRows.map((row) => row.total), 1);

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
          <div className="card-header"><div><h2>Grafik Ringkas</h2><p>Ringkasan omzet dan keuntungan dari transaksi yang tersimpan.</p></div></div>
          {transactions.length === 0 ? (
            <div className="empty-state compact"><strong>Belum ada data grafik</strong><span>Grafik akan muncul setelah ada transaksi.</span></div>
          ) : (
            <div className="grid gap-4">
              {[
                { label: "Omzet POS", value: posRevenue, className: "from-emerald-600 to-emerald-400" },
                { label: "Omzet Layanan", value: agentRevenue, className: "from-blue-600 to-cyan-400" },
                { label: "Keuntungan Agen", value: agentProfit, className: "from-amber-500 to-orange-400" },
                { label: "Total Omzet", value: totalRevenue, className: "from-violet-600 to-fuchsia-400" },
              ].map((row) => (
                <div key={row.label} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                    <span className="text-slate-600">{row.label}</span>
                    <strong>{formatRupiah(row.value)}</strong>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${row.className}`}
                      style={{ width: `${Math.max(6, Math.round((row.value / Math.max(totalRevenue, maxSummaryValue, 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-header"><div><h2>Metode Pembayaran</h2><p>Komposisi nilai transaksi berdasarkan cara bayar.</p></div></div>
          {paymentRows.length === 0 ? (
            <div className="empty-state compact"><strong>Belum ada pembayaran</strong><span>Data muncul setelah transaksi tersimpan.</span></div>
          ) : (
            <div className="grid gap-3">
              {paymentRows.map((row) => (
                <div key={row.method} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                    <span className="text-slate-600">{paymentLabel(row.method)}</span>
                    <strong>{formatRupiah(row.total)}</strong>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-400"
                      style={{ width: `${Math.max(8, Math.round((row.total / maxPaymentValue) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
