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

export function DailyRevenueChart({ transactions }: { transactions: TransactionRow[] }) {
  const data = buildDailyRevenueRows(transactions);
  const maxValue = Math.max(...data.flatMap((row) => [row.omzet, row.profit]), 1);
  const width = 700;
  const height = 230;
  const chartTop = 18;
  const chartBottom = 188;
  const chartLeft = 38;
  const chartRight = 680;
  const chartHeight = chartBottom - chartTop;
  const step = (chartRight - chartLeft) / Math.max(data.length - 1, 1);
  const point = (value: number, index: number) => {
    const x = chartLeft + index * step;
    const y = chartBottom - (value / maxValue) * chartHeight;
    return `${x},${y}`;
  };
  const omzetPoints = data.map((row, index) => point(row.omzet, index)).join(" ");
  const profitPoints = data.map((row, index) => point(row.profit, index)).join(" ");
  const areaPoints = `${chartLeft},${chartBottom} ${omzetPoints} ${chartRight},${chartBottom}`;

  return (
    <div className="mt-2 h-[230px] w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Grafik pendapatan tujuh hari">
        <defs>
          <linearGradient id="dailyOmzetFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#047857" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartBottom - ratio * chartHeight;
          return <line key={ratio} x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />;
        })}
        <text x="0" y={chartTop + 4} className="fill-slate-400 text-[11px] font-black">{compactCurrency(maxValue)}</text>
        <text x="0" y={chartBottom} className="fill-slate-400 text-[11px] font-black">Rp0</text>
        <polygon points={areaPoints} fill="url(#dailyOmzetFill)" />
        <polyline points={omzetPoints} fill="none" stroke="#047857" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={profitPoints} fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((row, index) => {
          const [x, y] = point(row.omzet, index).split(",").map(Number);
          return <circle key={row.label} cx={x} cy={y} r="4" fill="white" stroke="#047857" strokeWidth="2" />;
        })}
        {data.map((row, index) => (
          <text key={row.label} x={chartLeft + index * step} y="218" textAnchor="middle" className="fill-slate-500 text-[11px] font-black">{row.label}</text>
        ))}
        <g transform="translate(480 10)">
          <circle cx="0" cy="0" r="4" fill="#047857" /><text x="10" y="4" className="fill-slate-600 text-[11px] font-black">Omzet</text>
          <circle cx="80" cy="0" r="4" fill="#b45309" /><text x="90" y="4" className="fill-slate-600 text-[11px] font-black">Profit</text>
        </g>
      </svg>
    </div>
  );
}

export function ReportPerformanceChart({ data }: { data: ReportMetricRow[] }) {
  const maxValue = Math.max(...data.map((row) => row.value), 1);

  return (
    <div className="grid h-[292px] content-center gap-4">
      {data.map((row) => {
        const width = Math.max(4, Math.round((row.value / maxValue) * 100));
        return (
          <div key={row.label} className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-sm font-black">
              <span className="text-slate-700">{row.label}</span>
              <strong className="text-slate-950">{formatRupiah(row.value)}</strong>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: row.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PaymentMethodChart({ data }: { data: ReportMetricRow[] }) {
  const maxValue = Math.max(...data.map((row) => row.value), 1);

  return (
    <div className="flex h-[220px] items-end gap-3 rounded-2xl bg-slate-50 p-4">
      {data.map((row) => {
        const height = Math.max(8, Math.round((row.value / maxValue) * 150));
        return (
          <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <strong className="text-[11px] font-black text-slate-700">{formatRupiah(row.value)}</strong>
            <div className="w-full rounded-t-2xl" style={{ height, backgroundColor: row.color }} />
            <span className="max-w-full truncate text-[11px] font-black text-slate-500">{row.label}</span>
          </div>
        );
      })}
    </div>
  );
}
