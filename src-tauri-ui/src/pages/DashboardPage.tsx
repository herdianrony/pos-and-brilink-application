import { useEffect, useState } from "react";
import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { getDashboard } from "../api";
import { Card, Badge, Spinner, EmptyState } from "../components/ui";
import { formatRupiah, formatDateShort } from "../lib/format";
import { TrendingUp, Wallet, AlertTriangle, Landmark, CheckCircle2, ShoppingCart } from "lucide-react";
import { DashboardChart } from "./dashboard/DashboardChart";

type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function compactRupiah(value: number) {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)}rb`;
  return `Rp${value}`;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isToday(dateText: string) {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
  const [dashData, setDashData] = useState<DashboardData | null>(null);

  // Fetch dashboard data from backend on mount
  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((data) => { if (!cancelled) setDashData(data); })
      .catch(() => { /* fallback to client-side computation */ });
    return () => { cancelled = true; };
  }, [loading]); // refetch when loading changes (i.e. after refresh)

  /* ---- Use backend data when available, fallback to client-side ---- */

  const todayTransactions = transactions.filter((t) => isToday(t.created_at));

  const posToday = todayTransactions.filter((t) => t.transaction_type === "pos");
  const agentToday = todayTransactions.filter((t) => t.transaction_type === "brilink" || t.transaction_type === "agent");

  // Use backend aggregation for accurate stats
  const todayRevenue = dashData ? dashData.today_all.revenue : todayTransactions.reduce((s, t) => s + Math.max(t.total_amount, 0), 0);
  const todayProfit = dashData ? dashData.today_all.profit : todayTransactions.reduce((s, t) => s + Math.max(t.profit, 0), 0);
  const posRevenue = dashData ? dashData.today_pos.revenue : posToday.reduce((s, t) => s + Math.max(t.total_amount, 0), 0);
  const posProfit = dashData ? dashData.today_pos.profit : posToday.reduce((s, t) => s + Math.max(t.profit, 0), 0);
  const agentRevenue = dashData ? dashData.today_brilink.revenue : agentToday.reduce((s, t) => s + Math.max(t.total_amount, 0), 0);
  const agentProfit = dashData ? dashData.today_brilink.profit : agentToday.reduce((s, t) => s + Math.max(t.profit, 0), 0);
  const pendingCount = dashData ? dashData.pending_count : transactions.filter((t) => t.status === "pending").length;

  const lowStockProducts = dashData?.low_stock?.length
    ? dashData.low_stock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.min_stock, unit: "pcs" }))
    : products
        .filter((p) => p.stock <= p.min_stock)
        .slice(0, 10)
        .map((p) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.min_stock, unit: p.unit }));

  const lowBalanceAccounts = dashData?.accounts
    ? dashData.accounts.filter((a) => a.balance < 0).length > 0
      ? accounts.filter((a) => a.balance < a.min_balance)
      : []
    : accounts.filter((a) => a.balance < a.min_balance);

  /* ---- 7-day chart data (prefer backend, fallback client-side) ---- */

  const chartData = (() => {
    if (dashData?.last_7_days?.length) {
      return dashData.last_7_days.map((d) => ({
        label: new Date(d.date).toLocaleDateString("id-ID", { weekday: "short" }),
        date: formatDateShort(new Date(d.date)),
        revenue: d.revenue,
        profit: d.profit,
        count: 0,
      }));
    }
    // Fallback: client-side from transactions
    const today = new Date();
    const rows = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        key: dayKey(date),
        label: date.toLocaleDateString("id-ID", { weekday: "short" }),
        date: formatDateShort(date),
        revenue: 0,
        profit: 0,
        count: 0,
      };
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    for (const t of transactions) {
      const key = dayKey(new Date(t.created_at));
      const row = byKey.get(key);
      if (!row) continue;
      row.revenue += Math.max(t.total_amount, 0);
      row.profit += Math.max(t.profit, 0);
      row.count += 1;
    }
    return rows.map(({ key: _key, ...row }) => row);
  })();

  const chartHasActivity = chartData.some(
    (d) => d.revenue > 0 || d.profit > 0 || d.count > 0,
  );

  const chartTotals = chartData.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.revenue,
      profit: acc.profit + d.profit,
      count: acc.count + d.count,
    }),
    { revenue: 0, profit: 0, count: 0 },
  );

  /* ---- Tauri: always show profit (admin role assumed) ---- */
  const showProfit = true;
  const servicesLabel = "Layanan Agen";

  /* ---- Loading / empty ---- */

  if (loading) return <Spinner />;

  /* ---- Render ---- */

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">
            Ringkasan aktivitas bisnis Anda
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-card transition-all hover:shadow-pop hover:border-slate-300/60 disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {/* ── 2. Hero Card ── */}
      <Card
        className="p-6 gradient-dark text-white relative overflow-hidden border-0"
        style={{ backgroundColor: "#0F172A" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/25 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-slate-200 text-sm font-semibold">
              {showProfit ? "Keuntungan Hari Ini" : "Aktivitas Hari Ini"}
            </span>
          </div>
          <p className="text-4xl font-extrabold tracking-tight">
            {showProfit
              ? formatRupiah(todayProfit)
              : `${todayTransactions.length} Transaksi`}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-semibold">
              <ShoppingCart size={12} />
              <span>
                {showProfit
                  ? `POS: ${formatRupiah(posProfit)}`
                  : `POS: ${posToday.length} trx`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Landmark size={12} />
              <span>
                {servicesLabel}:{" "}
                {showProfit
                  ? formatRupiah(agentProfit)
                  : `${agentToday.length} trx`}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. Action Required ── */}
      {(() => {
        const actions: Array<{
          icon: typeof AlertTriangle;
          label: string;
          detail: string;
          color: "amber" | "red";
        }> = [];

        if (pendingCount > 0) {
          actions.push({
            icon: AlertTriangle,
            label: `${pendingCount} transaksi pending`,
            detail:
              "Selesaikan, void, atau reverse transaksi yang belum final.",
            color: "amber",
          });
        }
        if (lowStockProducts.length > 0) {
          actions.push({
            icon: AlertTriangle,
            label: `${lowStockProducts.length} produk stok menipis`,
            detail:
              "Cek stok fisik dan update stok produk sebelum habis.",
            color: "amber",
          });
        }
        if (lowBalanceAccounts.length > 0) {
          actions.push({
            icon: AlertTriangle,
            label: `${lowBalanceAccounts.length} rekening di bawah minimum`,
            detail:
              "Top up atau sesuaikan saldo agar transaksi tidak terhambat.",
            color: "red",
          });
        }

        if (actions.length === 0) {
          return (
            <Card className="p-4 border-emerald-200 bg-emerald-50/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2
                    size={22}
                    className="text-emerald-600"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-800">
                    Semua aman hari ini
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Tidak ada transaksi pending, stok kritis, atau rekening
                    di bawah minimum.
                  </p>
                </div>
              </div>
            </Card>
          );
        }

        return (
          <Card className="p-5 space-y-4 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle
                    size={24}
                    className="text-amber-600"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-amber-800">
                    Perlu Tindakan
                  </h3>
                  <p className="text-xs text-amber-700">
                    Prioritaskan item berikut sebelum lanjut operasional.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                {actions.length} item
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {actions.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 transition-all hover:shadow-card ${
                    a.color === "red"
                      ? "border-red-200 bg-red-50/80 hover:bg-red-50"
                      : "border-amber-200 bg-white hover:bg-amber-50/70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <a.icon
                      size={18}
                      className={
                        a.color === "red"
                          ? "text-red-500 mt-0.5"
                          : "text-amber-500 mt-0.5"
                      }
                    />
                    <div>
                      <p
                        className={
                          a.color === "red"
                            ? "font-extrabold text-red-700"
                            : "font-extrabold text-amber-700"
                        }
                      >
                        {a.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {a.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* ── 4. Quick Saldo Link ── */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Wallet size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Total Saldo: {formatRupiah(totalCash)}</p>
            <p className="text-xs text-slate-500">{accounts.length} rekening aktif</p>
          </div>
        </div>
        <span className="text-xs font-bold text-primary">Lihat di Keuangan →</span>
      </div>

      {/* ── 6. Chart + Low Stock (2:1 grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="font-extrabold text-slate-700 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" /> Pendapatan
                7 Hari
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {showProfit
                  ? "Omzet, profit, dan jumlah transaksi harian."
                  : "Omzet dan jumlah transaksi harian."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right">
              <div className="rounded-xl bg-blue-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-blue-500">
                  Omzet
                </p>
                <p className="text-xs font-extrabold text-blue-700">
                  {formatRupiah(chartTotals.revenue)}
                </p>
              </div>
              {showProfit && (
                <div className="rounded-xl bg-emerald-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-emerald-500">
                    Profit
                  </p>
                  <p className="text-xs font-extrabold text-emerald-700">
                    {formatRupiah(chartTotals.profit)}
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Trx
                </p>
                <p className="text-xs font-extrabold text-slate-700">
                  {chartTotals.count}
                </p>
              </div>
            </div>
          </div>
          {!chartHasActivity ? (
            <div className="h-[280px] flex items-center justify-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200">
              <EmptyState title="Belum ada transaksi 7 hari terakhir" />
            </div>
          ) : (
            <div className="h-[300px] w-full rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/70 to-white p-3">
              <DashboardChart data={chartData} showProfit={showProfit} />
            </div>
          )}
        </Card>

        {/* Low Stock side panel */}
        <Card className="p-5">
          <h3 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Stok
            Menipis
          </h3>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle2 size={28} className="text-emerald-500" />
              <span>Semua stok aman</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-100"
                >
                  <span className="text-sm text-slate-700 truncate flex-1">
                    {p.name}
                  </span>
                  <Badge variant="danger">
                    {p.stock} {p.unit}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}