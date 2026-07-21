import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { DailyRevenueChart } from "../components/charts/BusinessCharts";
import { Button, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { formatRupiah, paymentLabel } from "../lib/format";
import type { ViewKey } from "../types";
import { Landmark, ReceiptText, ShoppingCart, TrendingUp } from "lucide-react";
import { tw } from "../lib/tw";

function accountTone(index: number) {
  return ["account-green", "account-blue", "account-navy", "account-purple"][index % 4];
}

export function DashboardPage({
  accounts,
  products,
  transactions,
  totalCash,
  lowStockCount,
  loading,
  onNavigate,
  onRefresh,
}: {
  accounts: AccountRow[];
  products: ProductRow[];
  transactions: TransactionRow[];
  totalCash: number;
  lowStockCount: number;
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

      <section className={tw("electron-hero-card")}>
        <div className={tw("hero-icon-box")}>▣</div>
        <span>Keuntungan Hari Ini</span>
        <strong>{formatRupiah(totalProfit)}</strong>
        <div className={tw("hero-chip-row")}>
          <button type="button" onClick={() => onNavigate("pos")}>POS: {formatRupiah(posProfit)}</button>
          <button type="button" onClick={() => onNavigate("brilink")}>Layanan: {formatRupiah(agentProfit)}</button>
        </div>
      </section>

      <section className={tw("electron-stat-grid")}>
        <StatCard tone="green" icon={<ReceiptText size={20} />} label="Total Transaksi" value={transactions.length} sub="hari ini" />
        <StatCard tone="blue" icon={<ShoppingCart size={20} />} label="Omzet POS" value={formatRupiah(posRevenue)} sub={`${posTransactions.length} trx`} />
        <StatCard tone="purple" icon={<Landmark size={20} />} label="Volume Layanan" value={formatRupiah(agentRevenue)} sub={`${agentTransactions.length} trx`} />
        <StatCard tone="amber" icon={<TrendingUp size={20} />} label="Keuntungan Agen" value={formatRupiah(agentProfit)} sub="profit layanan" />
      </section>

      <section className={tw("safe-banner")}>
        <span>✓</span>
        <div>
          <strong>{lowStockCount === 0 ? "Semua aman hari ini" : `${lowStockCount} produk stok menipis`}</strong>
          <p>{lowStockCount === 0 ? "Tidak ada transaksi pending, stok kritis, atau rekening di bawah minimum." : "Segera cek produk dengan stok di bawah batas minimum."}</p>
        </div>
      </section>

      <section className={tw("account-section-head")}>
        <strong>Saldo Rekening</strong>
        <span>{accounts.length} akun</span>
      </section>
      <section className={tw("account-card-row")}>
        {accounts.slice(0, 4).map((account, index) => (
          <button key={account.id} className={tw(`account-balance-card ${accountTone(index)}`)} onClick={() => onNavigate("cash")}>
            <span>{account.code === "cash" ? "Kas Tunai" : "Rekening"}</span>
            <strong>{account.name}</strong>
            <small>Saldo Tercatat</small>
            <b>{formatRupiah(account.balance)}</b>
          </button>
        ))}
      </section>

      <section className={tw("electron-dashboard-grid")}>
        <SectionCard
          className={tw("chart-card")}
          title="Pendapatan 7 Hari"
          description="Omzet, profit, dan jumlah transaksi harian."
          actions={(
            <div className={tw("flex flex-wrap items-center justify-end gap-2")}>
              <div className={tw("chart-summary-pill")}><span>Omzet</span><strong>{formatRupiah(posRevenue + agentRevenue)}</strong></div>
              <div className={tw("chart-summary-pill green")}><span>Profit</span><strong>{formatRupiah(totalProfit)}</strong></div>
              <div className={tw("chart-summary-pill")}><span>TRX</span><strong>{transactions.length}</strong></div>
            </div>
          )}
        >
          <DailyRevenueChart transactions={transactions} />
        </SectionCard>

        <SectionCard className={tw("stock-card")} title="Stok Menipis" description="Produk yang perlu segera dicek.">
          {lowStockProducts.map((product) => (
            <div key={product.id} className={tw("row rich-row warning-row")}><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><span className={tw("status-badge warning")}>Stok rendah</span></div>
          ))}
          {lowStockCount === 0 && <EmptyState compact title="Semua stok aman" description="Tidak ada produk di bawah minimum." />}
        </SectionCard>
      </section>

      <section className={tw("dashboard-bottom-grid")}>
        <SectionCard title="Transaksi Terakhir" description="Aktivitas terbaru yang tercatat di kasir dan layanan.">
          {transactions.length === 0 ? <EmptyState title="Belum ada transaksi" description="Jika sudah ada penjualan atau layanan, datanya akan muncul di sini." /> : transactions.slice(0, 6).map((transaction) => (
            <div key={transaction.id} className={tw("row rich-row")}>
              <div><strong>{transaction.invoice_no}</strong><small>{paymentLabel(transaction.payment_method)} • {transaction.transaction_type === "pos" ? "Kasir POS" : "Layanan Agen"}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </SectionCard>
        <SectionCard title="Yang Perlu Dicek" description="Ringkasan sederhana agar pemilik toko mudah memantau kondisi usaha.">
          <div className={tw("dashboard-check-list")}>
            <div><span className={tw(lowStockCount === 0 ? "status-badge" : "status-badge warning")}>{lowStockCount === 0 ? "Aman" : "Cek"}</span><div><strong>Stok Barang</strong><small>{lowStockCount === 0 ? "Tidak ada produk di bawah stok minimum." : `${lowStockCount} produk perlu segera ditambah.`}</small></div></div>
            <div><span className={tw("status-badge")}>Saldo</span><div><strong>{formatRupiah(totalCash)}</strong><small>Total kas dan rekening yang tercatat.</small></div></div>
            <div><span className={tw(transactions.length === 0 ? "status-badge warning" : "status-badge")}>{transactions.length}</span><div><strong>Transaksi Hari Ini</strong><small>{transactions.length === 0 ? "Belum ada aktivitas penjualan/layanan." : "Aktivitas usaha sudah tercatat."}</small></div></div>
          </div>
        </SectionCard>
      </section>
    </>
  );
}
