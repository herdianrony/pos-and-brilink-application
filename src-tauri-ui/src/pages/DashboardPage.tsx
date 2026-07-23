import { useMemo } from "react";
import type { AccountRow, ProductRow, TransactionRow } from "../api";
import { Card, StatCard, Badge, Spinner, EmptyState } from "../components/ui";
import { formatRupiah, paymentLabel, formatDate, formatDateShort } from "../lib/format";
import {
  TrendingUp,
  ShoppingCart,
  Landmark,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

interface ChartTooltipPayloadItem {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
}

function DashboardChartTooltip({
  active,
  payload,
  label,
  showProfit,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  showProfit?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const values = Object.fromEntries(
    payload.map((item) => [item.dataKey, item.value]),
  );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl">
      <p className="mb-2 text-xs font-extrabold text-slate-700">{label}</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-5">
          <span className="font-semibold text-slate-500">Omzet</span>
          <span className="font-extrabold text-emerald-700">
            {formatRupiah(Number(values.revenue || 0))}
          </span>
        </div>
        {showProfit && (
          <div className="flex items-center justify-between gap-5">
            <span className="font-semibold text-slate-500">Profit</span>
            <span className="font-extrabold text-emerald-600">
              {formatRupiah(Number(values.profit || 0))}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-5">
          <span className="font-semibold text-slate-500">Transaksi</span>
          <span className="font-extrabold text-amber-600">
            {Number(values.count || 0)}
          </span>
        </div>
      </div>
    </div>
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
  /* ---- Derived data ---- */

  const todayTransactions = useMemo(
    () => transactions.filter((t) => isToday(t.created_at)),
    [transactions],
  );

  const posToday = useMemo(
    () => todayTransactions.filter((t) => t.transaction_type === "pos"),
    [todayTransactions],
  );
  const agentToday = useMemo(
    () => todayTransactions.filter((t) => t.transaction_type === "agent"),
    [todayTransactions],
  );

  const todayRevenue = todayTransactions.reduce(
    (s, t) => s + Math.max(t.total_amount, 0),
    0,
  );
  const todayProfit = todayTransactions.reduce(
    (s, t) => s + Math.max(t.profit, 0),
    0,
  );
  const posRevenue = posToday.reduce(
    (s, t) => s + Math.max(t.total_amount, 0),
    0,
  );
  const posProfit = posToday.reduce(
    (s, t) => s + Math.max(t.profit, 0),
    0,
  );
  const agentRevenue = agentToday.reduce(
    (s, t) => s + Math.max(t.total_amount, 0),
    0,
  );
  const agentProfit = agentToday.reduce(
    (s, t) => s + Math.max(t.profit, 0),
    0,
  );

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => p.stock <= p.min_stock)
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          minStock: p.min_stock,
          unit: p.unit,
        })),
    [products],
  );

  const lowBalanceAccounts = useMemo(
    () => accounts.filter((a) => a.balance < a.min_balance),
    [accounts],
  );

  /* ---- 7-day chart data ---- */

  const chartData = useMemo(() => {
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
  }, [transactions]);

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

      {/* ── 3. Stat Cards (4-col grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<ShoppingCart size={20} />}
          label="Total Transaksi"
          value={todayTransactions.length.toString()}
          sub="hari ini"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={<ArrowUpRight size={20} />}
          label="Omzet POS"
          value={formatRupiah(posRevenue)}
          sub={`${posToday.length} trx`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Landmark size={20} />}
          label={`Volume ${servicesLabel}`}
          value={formatRupiah(agentRevenue)}
          sub={`${agentToday.length} trx`}
          color="bg-violet-50 text-violet-600"
        />
        {showProfit ? (
          <StatCard
            icon={<TrendingUp size={20} />}
            label={`Fee ${servicesLabel}`}
            value={formatRupiah(agentProfit)}
            sub="profit layanan"
            color="bg-amber-50 text-amber-600"
          />
        ) : (
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Transaksi Selesai"
            value={(posToday.length + agentToday.length).toString()}
            sub="hari ini"
            color="bg-amber-50 text-amber-600"
          />
        )}
      </div>

      {/* ── 4. Action Required ── */}
      {(() => {
        const pendingCount = transactions.filter(
          (t) => t.status === "pending",
        ).length;

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

      {/* ── 5. Account Balances — horizontal scroll ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Saldo Rekening
          </h3>
          <span className="text-xs text-slate-400">
            {accounts.length} akun
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {accounts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-sm text-slate-500">
              Belum ada rekening
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="shrink-0 w-[200px] rounded-2xl border border-slate-200/60 bg-white p-4 shadow-card hover:shadow-pop transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white"
                    style={{
                      backgroundColor:
                        acc.color || acc.code === "cash"
                          ? "#00875A"
                          : "#3b82f6",
                    }}
                  >
                    {(acc.icon || acc.name).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-500 truncate">
                    {acc.name}
                  </span>
                </div>
                <p className="text-base font-extrabold text-slate-900">
                  {formatRupiah(acc.balance)}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {acc.code === "cash" ? "Kas Tunai" : "Rekening"}
                </p>
              </div>
            ))
          )}
        </div>
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
              <p className="text-xs text-slate-400 mt-1">
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
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashboardRevenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#00875A"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="95%"
                        stopColor="#00875A"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                    minTickGap={8}
                  />
                  <YAxis
                    yAxisId="money"
                    axisLine={false}
                    tickLine={false}
                    width={72}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={(value) =>
                      compactRupiah(Number(value))
                    }
                  />
                  <YAxis
                    yAxisId="count"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    width={34}
                    allowDecimals={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <Tooltip
                    content={
                      <DashboardChartTooltip showProfit={showProfit} />
                    }
                    cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      fontWeight: 700,
                      paddingTop: 8,
                    }}
                  />
                  <Area
                    yAxisId="money"
                    type="monotone"
                    dataKey="revenue"
                    name="Omzet"
                    stroke="#00875A"
                    strokeWidth={2}
                    fill="url(#dashboardRevenueGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {showProfit && (
                    <Bar
                      yAxisId="money"
                      dataKey="profit"
                      name="Profit"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={36}
                    />
                  )}
                  <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="count"
                    name="Transaksi"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
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

      {/* ── 7. Recent Transactions table ── */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-700">
            Transaksi Terakhir
          </h3>
        </div>
        {transactions.length === 0 ? (
          <EmptyState title="Belum ada transaksi" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Transaksi Terbaru</caption>
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left p-3 font-medium">Invoice</th>
                  <th className="text-left p-3 font-medium">Tipe</th>
                  <th className="text-left p-3 font-medium">Pelanggan</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  {showProfit && (
                    <th className="text-right p-3 font-medium">
                      Profit
                    </th>
                  )}
                  <th className="text-left p-3 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-50/50 hover:bg-emerald-50/30 transition-colors"
                  >
                    <td className="p-3 font-mono text-xs text-slate-500">
                      {t.invoice_no}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          t.transaction_type === "pos"
                            ? "primary"
                            : "purple"
                        }
                      >
                        {t.transaction_type === "pos"
                          ? "POS"
                          : servicesLabel}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600">
                      {t.customer_name || "—"}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatRupiah(t.total_amount)}
                    </td>
                    {showProfit && (
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {formatRupiah(t.profit)}
                      </td>
                    )}
                    <td className="p-3 text-slate-400 text-xs">
                      {formatDate(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}