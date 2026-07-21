import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { PageHeader, StatCard } from "../components/ui";
import { formatRupiah, paymentLabel } from "../lib/format";
import type { ViewKey } from "../types";
import { Landmark, ReceiptText, ShoppingCart, TrendingUp } from "lucide-react";

function accountTone(index: number) {
  return ["account-green", "account-blue", "account-navy", "account-purple"][index % 4];
}

function ChartPreview({ transactions }: { transactions: TransactionRow[] }) {
  const values = Array.from({ length: 7 }, (_, index) => {
    const row = transactions[index];
    return row ? Math.max(row.total_amount, 0) : 0;
  }).reverse();
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 24 + index * 76;
    const y = 180 - (value / max) * 130;
    return `${x},${y}`;
  }).join(" ");
  const profitPoints = values.map((value, index) => {
    const x = 24 + index * 76;
    const y = 185 - ((value * 0.42) / max) * 130;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="dashboard-chart" viewBox="0 0 520 210" role="img" aria-label="Grafik pendapatan tujuh hari">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00875a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#00875a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120, 160, 200].map((y) => <line key={y} x1="20" x2="500" y1={y} y2={y} className="chart-grid-line" />)}
      <polyline points={`24,190 ${points} 480,190`} fill="url(#chartFill)" stroke="none" />
      <polyline points={points} className="chart-line chart-line-green" />
      <polyline points={profitPoints} className="chart-line chart-line-gold" />
      {values.map((_, index) => <circle key={index} cx={24 + index * 76} cy={180 - (values[index] / max) * 130} r="4" className="chart-dot" />)}
      {values.map((_, index) => <text key={`d-${index}`} x={24 + index * 76} y="205" textAnchor="middle" className="chart-label">{index + 1}</text>)}
    </svg>
  );
}

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
  const posTransactions = transactions.filter((transaction) => transaction.transaction_type === "pos");
  const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
  const posRevenue = posTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const agentRevenue = agentTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const posProfit = posTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
  const agentProfit = agentTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
  const totalProfit = posProfit + agentProfit;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan aktivitas bisnis Anda"
        actions={<button className="secondary" onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>}
      />

      <section className="electron-hero-card">
        <div className="hero-icon-box">▣</div>
        <span>Keuntungan Hari Ini</span>
        <strong>{formatRupiah(totalProfit)}</strong>
        <div className="hero-chip-row">
          <button type="button" onClick={() => onNavigate("pos")}>POS: {formatRupiah(posProfit)}</button>
          <button type="button" onClick={() => onNavigate("brilink")}>Layanan: {formatRupiah(agentProfit)}</button>
        </div>
      </section>

      <section className="electron-stat-grid">
        <StatCard tone="green" icon={<ReceiptText size={20} />} label="Total Transaksi" value={transactions.length} sub="hari ini" />
        <StatCard tone="blue" icon={<ShoppingCart size={20} />} label="Omzet POS" value={formatRupiah(posRevenue)} sub={`${posTransactions.length} trx`} />
        <StatCard tone="purple" icon={<Landmark size={20} />} label="Volume Layanan" value={formatRupiah(agentRevenue)} sub={`${agentTransactions.length} trx`} />
        <StatCard tone="amber" icon={<TrendingUp size={20} />} label="Keuntungan Agen" value={formatRupiah(agentProfit)} sub="profit layanan" />
      </section>

      <section className="safe-banner">
        <span>✓</span>
        <div>
          <strong>{lowStockCount === 0 ? "Semua aman hari ini" : `${lowStockCount} produk stok menipis`}</strong>
          <p>{lowStockCount === 0 ? "Tidak ada transaksi pending, stok kritis, atau rekening di bawah minimum." : "Segera cek produk dengan stok di bawah batas minimum."}</p>
        </div>
      </section>

      <section className="account-section-head">
        <strong>Saldo Rekening</strong>
        <span>{accounts.length} akun</span>
      </section>
      <section className="account-card-row">
        {accounts.slice(0, 4).map((account, index) => (
          <button key={account.id} className={`account-balance-card ${accountTone(index)}`} onClick={() => onNavigate("cash")}>
            <span>{account.code === "cash" ? "Kas Tunai" : "Rekening"}</span>
            <strong>{account.name}</strong>
            <small>Saldo Tercatat</small>
            <b>{formatRupiah(account.balance)}</b>
          </button>
        ))}
      </section>

      <section className="electron-dashboard-grid">
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <h2>Pendapatan 7 Hari</h2>
              <p>Omzet, profit, dan jumlah transaksi harian.</p>
            </div>
            <div className="chart-summary-pill"><span>Omzet</span><strong>{formatRupiah(posRevenue + agentRevenue)}</strong></div>
            <div className="chart-summary-pill green"><span>Profit</span><strong>{formatRupiah(totalProfit)}</strong></div>
            <div className="chart-summary-pill"><span>TRX</span><strong>{transactions.length}</strong></div>
          </div>
          <ChartPreview transactions={transactions} />
        </div>
        <div className="card stock-card">
          <div className="card-header"><div><h2>Stok Menipis</h2><p>Produk yang perlu segera dicek.</p></div></div>
          {products.filter((product) => product.stock <= product.min_stock).slice(0, 6).map((product) => (
            <div key={product.id} className="row rich-row warning-row"><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><span className="status-badge warning">Stok rendah</span></div>
          ))}
          {lowStockCount === 0 && <div className="empty-state compact"><strong>Semua stok aman</strong><span>Tidak ada produk di bawah minimum.</span></div>}
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
          <div className="card-header"><div><h2>Aksi Cepat</h2><p>Mulai aktivitas utama.</p></div></div>
          <div className="quick-launch-grid compact-launch">
            <button onClick={() => onNavigate("pos")} className="launch-card"><span>Kasir POS</span></button>
            <button onClick={() => onNavigate("brilink")} className="launch-card"><span>Layanan</span></button>
            <button onClick={() => onNavigate("debts")} className="launch-card"><span>Buku Utang</span></button>
            <button onClick={() => onNavigate("cash")} className="launch-card"><span>Kas & Saldo</span></button>
          </div>
          <div className="divider" />
          <div className="row rich-row"><div><strong>Keranjang Aktif</strong><small>{cartCount} item siap checkout</small></div><strong>{formatRupiah(cartTotal)}</strong></div>
          <div className="row rich-row"><div><strong>Total Saldo</strong><small>Semua akun aktif</small></div><strong>{formatRupiah(totalCash)}</strong></div>
        </div>
      </section>
    </>
  );
}
