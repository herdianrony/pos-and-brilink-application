import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { DailyRevenueChart } from "../components/charts/BusinessCharts";
import { Button, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { formatRupiah, paymentLabel } from "../lib/format";
import type { ViewKey } from "../types";
import { Landmark, ReceiptText, ShoppingCart, TrendingUp } from "lucide-react";

function accountTone(index: number) {
  return ["account-green", "account-blue", "account-navy", "account-purple"][index % 4];
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
  const lowStockProducts = products.filter((product) => product.stock <= product.min_stock).slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan aktivitas bisnis Anda"
        actions={<Button variant="secondary" onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</Button>}
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
        <SectionCard
          className="chart-card"
          title="Pendapatan 7 Hari"
          description="Omzet, profit, dan jumlah transaksi harian."
          actions={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="chart-summary-pill"><span>Omzet</span><strong>{formatRupiah(posRevenue + agentRevenue)}</strong></div>
              <div className="chart-summary-pill green"><span>Profit</span><strong>{formatRupiah(totalProfit)}</strong></div>
              <div className="chart-summary-pill"><span>TRX</span><strong>{transactions.length}</strong></div>
            </div>
          )}
        >
          <DailyRevenueChart transactions={transactions} />
        </SectionCard>

        <SectionCard className="stock-card" title="Stok Menipis" description="Produk yang perlu segera dicek.">
          {lowStockProducts.map((product) => (
            <div key={product.id} className="row rich-row warning-row"><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><span className="status-badge warning">Stok rendah</span></div>
          ))}
          {lowStockCount === 0 && <EmptyState compact title="Semua stok aman" description="Tidak ada produk di bawah minimum." />}
        </SectionCard>
      </section>

      <section className="grid dashboard-grid">
        <SectionCard title="Transaksi Terakhir" description="Aktivitas POS dan layanan agen terbaru.">
          {transactions.length === 0 ? <EmptyState title="Belum ada transaksi" description="Mulai dari Kasir POS atau Layanan Agen." /> : transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="row rich-row">
              <div><strong>{transaction.invoice_no}</strong><small>{paymentLabel(transaction.payment_method)} • {transaction.status}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </SectionCard>
        <SectionCard title="Aksi Cepat" description="Mulai aktivitas utama.">
          <div className="quick-launch-grid compact-launch">
            <button onClick={() => onNavigate("pos")} className="launch-card"><span>Kasir POS</span></button>
            <button onClick={() => onNavigate("brilink")} className="launch-card"><span>Layanan</span></button>
            <button onClick={() => onNavigate("debts")} className="launch-card"><span>Buku Utang</span></button>
            <button onClick={() => onNavigate("cash")} className="launch-card"><span>Kas & Saldo</span></button>
          </div>
          <div className="divider" />
          <div className="row rich-row"><div><strong>Keranjang Aktif</strong><small>{cartCount} item siap checkout</small></div><strong>{formatRupiah(cartTotal)}</strong></div>
          <div className="row rich-row"><div><strong>Total Saldo</strong><small>Semua akun aktif</small></div><strong>{formatRupiah(totalCash)}</strong></div>
        </SectionCard>
      </section>
    </>
  );
}
