import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TransactionRow } from "../../api";
import { formatRupiah } from "../../lib/format";

type DailyRevenueRow = {
  label: string;
  omzet: number;
  profit: number;
  trx: number;
};

export type ReportMetricRow = {
  label: string;
  value: number;
  color: string;
};

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}jt`;
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)}rb`;
  return `Rp${value}`;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailyRevenueRows(transactions: TransactionRow[]): DailyRevenueRow[] {
  const today = new Date();
  const rows = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: dayKey(date),
      label: date.toLocaleDateString("id-ID", { weekday: "short" }),
      omzet: 0,
      profit: 0,
      trx: 0,
    };
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));

  for (const transaction of transactions) {
    const key = dayKey(new Date(transaction.created_at));
    const row = byKey.get(key);
    if (!row) continue;
    row.omzet += Math.max(transaction.total_amount, 0);
    row.profit += Math.max(transaction.profit, 0);
    row.trx += 1;
  }

  return rows.map(({ key: _key, ...row }) => row);
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-3 text-xs shadow-xl backdrop-blur">
      <strong className="mb-2 block text-slate-900">{label}</strong>
      <div className="grid gap-1.5">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-5 font-extrabold text-slate-600">
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span>
            <span className="text-slate-900">{item.name === "trx" ? item.value : formatRupiah(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyRevenueChart({ transactions }: { transactions: TransactionRow[] }) {
  const data = buildDailyRevenueRows(transactions);

  return (
    <div className="mt-2 h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="omzetGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00875a" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#00875a" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }} tickFormatter={compactCurrency} width={58} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="omzet" name="Omzet" stroke="#00875a" strokeWidth={3} fill="url(#omzetGradient)" dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} />
          <Area type="monotone" dataKey="profit" name="Profit" stroke="#d97706" strokeWidth={3} fill="url(#profitGradient)" dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportPerformanceChart({ data }: { data: ReportMetricRow[] }) {
  return (
    <div className="h-[292px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 22, left: 18, bottom: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }} tickFormatter={compactCurrency} />
          <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 12, fontWeight: 900 }} width={112} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,.04)" }} />
          <Bar dataKey="value" name="Nilai" radius={[0, 12, 12, 0]} barSize={22}>
            {data.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentMethodChart({ data }: { data: ReportMetricRow[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 900 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }} tickFormatter={compactCurrency} width={54} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,.04)" }} />
          <Bar dataKey="value" name="Nilai" radius={[12, 12, 0, 0]} barSize={34}>
            {data.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
