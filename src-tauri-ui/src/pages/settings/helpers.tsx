import { Badge } from "../../components/ui";

export function logLevelBadge(level: string) {
  if (level === "ERROR") return <Badge variant="danger">ERROR</Badge>;
  if (level === "WARN") return <Badge variant="warning">WARN</Badge>;
  return <Badge variant="success">INFO</Badge>;
}

export function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "lunas" || s === "selesai" || s === "completed")
    return <Badge variant="success">{status}</Badge>;
  if (s === "belum_bayar" || s === "belum_bayar_sebagian" || s === "pending")
    return <Badge variant="warning">{status}</Badge>;
  if (s === "batal" || s === "cancelled")
    return <Badge variant="danger">{status}</Badge>;
  return <Badge>{status}</Badge>;
}

/** Stats card grid pattern used across tabs */
export function StatCards({ stats }: { stats: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
