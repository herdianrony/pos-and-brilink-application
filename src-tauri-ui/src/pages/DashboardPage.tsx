import { useMemo, useState } from "react";
import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { Button, ChipTabs, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { formatRupiah, paymentLabel } from "../lib/format";
import { Landmark, ReceiptText, TrendingUp } from "lucide-react";
import { tw } from "../lib/tw";

type DashboardPeriod = "today" | "week" | "all";

function inDashboardPeriod(dateText: string, period: DashboardPeriod) {
  if (period === "all") return true;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return true;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - 6);
  return date >= start;
}

const periodLabels: Record<DashboardPeriod, string> = {
  today: "Hari Ini",
  week: "7 Hari",
  all: "Semua Waktu",
};

export function DashboardPage({
  accounts,
  products,
  transactions,
  totalCash,
  lowStockCount,
  loading,
  onRefresh,
}: {
  accounts: AccountRow[];
  products: ProductRow[];
  transactions: TransactionRow[];
  totalCash: number;
  lowStockCount: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const periodTransactions = useMemo(() => transactions.filter((transaction) => inDashboardPeriod(transaction.created_at, period)), [period, transactions]);
  const posTransactions = periodTransactions.filter((transaction) => transaction.transaction_type === "pos");
  const agentTransactions = periodTransactions.filter((transaction) => transaction.transaction_type === "agent");
  const totalRevenue = periodTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const totalProfit = periodTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
  const lowStockProducts = products.filter((product) => product.stock <= product.min_stock).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan paling penting untuk memantau usaha hari ini."
        actions={<Button variant="secondary" onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</Button>}
      />

      <ChipTabs
        className={tw("mb-4")}
        items={(["today", "week", "all"] as DashboardPeriod[]).map((item) => ({ id: item, label: periodLabels[item] }))}
        active={period}
        onChange={setPeriod}
        ariaLabel="Periode dashboard"
      />

      <section className={tw("electron-stat-grid dashboard-simple-stats")}>
        <StatCard tone="green" icon={<ReceiptText size={20} />} label={`Omzet ${periodLabels[period]}`} value={formatRupiah(totalRevenue)} sub={`${periodTransactions.length} transaksi`} />
        <StatCard tone="amber" icon={<TrendingUp size={20} />} label={`Keuntungan ${periodLabels[period]}`} value={formatRupiah(totalProfit)} sub="POS + layanan" />
        <StatCard tone="blue" icon={<Landmark size={20} />} label="Saldo" value={formatRupiah(totalCash)} sub={`${accounts.length} akun aktif`} />
      </section>

      <section className={tw("safe-banner")}> 
        <span>{lowStockCount === 0 ? "✓" : "!"}</span>
        <div>
          <strong>{lowStockCount === 0 ? "Semua stok aman" : `${lowStockCount} produk stok menipis`}</strong>
          <p>{lowStockCount === 0 ? "Tidak ada produk di bawah stok minimum." : "Segera cek dan tambah stok produk yang mulai habis."}</p>
        </div>
      </section>

      <SectionCard title="Saldo Rekening" description="Kas dan rekening aktif yang tercatat di aplikasi.">
        {accounts.length === 0 ? <EmptyState compact title="Belum ada rekening" description="Tambahkan rekening di menu Keuangan." /> : (
          <div className={tw("dashboard-account-list")}>
            {accounts.slice(0, 5).map((account) => (
              <div key={account.id} className={tw("row rich-row")}> 
                <div><strong>{account.name}</strong><small>{account.code === "cash" ? "Kas Tunai" : "Rekening / saldo non-tunai"}</small></div>
                <strong>{formatRupiah(account.balance)}</strong>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <section className={tw("dashboard-bottom-grid")}>
        <SectionCard title="Transaksi Terakhir" description="Aktivitas terbaru dari POS dan layanan agen.">
          {periodTransactions.length === 0 ? <EmptyState title="Belum ada transaksi" description="Mulai dari Kasir POS atau Layanan Agen." /> : periodTransactions.slice(0, 6).map((transaction) => (
            <div key={transaction.id} className={tw("row rich-row")}>
              <div><strong>{transaction.invoice_no}</strong><small>{paymentLabel(transaction.payment_method)} • {transaction.transaction_type === "pos" ? "Kasir POS" : "Layanan Agen"}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </SectionCard>
        <SectionCard title="Stok Menipis" description="Produk yang perlu segera dicek.">
          {lowStockProducts.length === 0 ? <EmptyState compact title="Stok aman" description="Tidak ada produk di bawah minimum." /> : lowStockProducts.map((product) => (
            <div key={product.id} className={tw("row rich-row warning-row")}><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><span className={tw("status-badge warning")}>Cek</span></div>
          ))}
        </SectionCard>
      </section>

      <section className={tw("dashboard-bottom-grid")}> 
        <SectionCard title="Ringkasan Aktivitas" description="Pembagian aktivitas hari ini.">
          <div className={tw("dashboard-check-list")}> 
            <div><span className={tw("status-badge")}>{posTransactions.length}</span><div><strong>Transaksi POS</strong><small>Penjualan produk retail.</small></div></div>
            <div><span className={tw("status-badge")}>{agentTransactions.length}</span><div><strong>Layanan Agen</strong><small>Transfer, tarik/setor tunai, topup, dan payment.</small></div></div>
          </div>
        </SectionCard>
      </section>
    </>
  );
}
