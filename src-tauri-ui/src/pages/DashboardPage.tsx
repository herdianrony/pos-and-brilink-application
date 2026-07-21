import { useMemo, useState } from "react";
import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { Button, ChipTabs, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { formatRupiah, paymentLabel } from "../lib/format";
import { Landmark, ReceiptText, TrendingUp } from "lucide-react";

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
        className="mb-4"
        items={(["today", "week", "all"] as DashboardPeriod[]).map((item) => ({ id: item, label: periodLabels[item] }))}
        active={period}
        onChange={setPeriod}
        ariaLabel="Periode dashboard"
      />

      <section className="mb-4 grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1 grid-cols-3 max-[980px]:grid-cols-1">
        <StatCard tone="green" icon={<ReceiptText size={20} />} label={`Omzet ${periodLabels[period]}`} value={formatRupiah(totalRevenue)} sub={`${periodTransactions.length} transaksi`} />
        <StatCard tone="amber" icon={<TrendingUp size={20} />} label={`Keuntungan ${periodLabels[period]}`} value={formatRupiah(totalProfit)} sub="POS + layanan" />
        <StatCard tone="blue" icon={<Landmark size={20} />} label="Saldo" value={formatRupiah(totalCash)} sub={`${accounts.length} akun aktif`} />
      </section>

      <section className="mb-5 flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,.05)] [&>span]:grid [&>span]:h-12 [&>span]:w-12 [&>span]:place-items-center [&>span]:rounded-2xl [&>span]:bg-emerald-50 [&>span]:text-xl [&>span]:font-black [&>span]:text-emerald-600 [&_strong]:text-emerald-700 [&_p]:m-0 [&_p]:text-sm [&_p]:text-emerald-700/80"> 
        <span>{lowStockCount === 0 ? "✓" : "!"}</span>
        <div>
          <strong>{lowStockCount === 0 ? "Semua stok aman" : `${lowStockCount} produk stok menipis`}</strong>
          <p>{lowStockCount === 0 ? "Tidak ada produk di bawah stok minimum." : "Segera cek dan tambah stok produk yang mulai habis."}</p>
        </div>
      </section>

      <SectionCard title="Saldo Rekening" description="Kas dan rekening aktif yang tercatat di aplikasi.">
        {accounts.length === 0 ? <EmptyState compact title="Belum ada rekening" description="Tambahkan rekening di menu Keuangan." /> : (
          <div className="dashboard-account-list">
            {accounts.slice(0, 5).map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block"> 
                <div><strong>{account.name}</strong><small>{account.code === "cash" ? "Kas Tunai" : "Rekening / saldo non-tunai"}</small></div>
                <strong>{formatRupiah(account.balance)}</strong>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <section className="mb-4 grid grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] items-start gap-4 max-[980px]:grid-cols-1">
        <SectionCard title="Transaksi Terakhir" description="Aktivitas terbaru dari POS dan layanan agen.">
          {periodTransactions.length === 0 ? <EmptyState title="Belum ada transaksi" description="Mulai dari Kasir POS atau Layanan Agen." /> : periodTransactions.slice(0, 6).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block">
              <div><strong>{transaction.invoice_no}</strong><small>{paymentLabel(transaction.payment_method)} • {transaction.transaction_type === "pos" ? "Kasir POS" : "Layanan Agen"}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </SectionCard>
        <SectionCard title="Stok Menipis" description="Produk yang perlu segera dicek.">
          {lowStockProducts.length === 0 ? <EmptyState compact title="Stok aman" description="Tidak ada produk di bawah minimum." /> : lowStockProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block mx-0 my-1 rounded-2xl bg-amber-50 px-3"><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700 bg-amber-50 text-amber-700">Cek</span></div>
          ))}
        </SectionCard>
      </section>

      <section className="mb-4 grid grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] items-start gap-4 max-[980px]:grid-cols-1"> 
        <SectionCard title="Ringkasan Aktivitas" description="Pembagian aktivitas hari ini.">
          <div className="grid gap-3 [&>div]:flex [&>div]:items-start [&>div]:gap-3 [&>div]:rounded-2xl [&>div]:border [&>div]:border-slate-100 [&>div]:bg-slate-50 [&>div]:p-3.5 [&_small]:mt-1 [&_small]:block [&_small]:text-slate-500"> 
            <div><span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">{posTransactions.length}</span><div><strong>Transaksi POS</strong><small>Penjualan produk retail.</small></div></div>
            <div><span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">{agentTransactions.length}</span><div><strong>Layanan Agen</strong><small>Transfer, tarik/setor tunai, topup, dan payment.</small></div></div>
          </div>
        </SectionCard>
      </section>
    </>
  );
}
