import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Database, RefreshCw, ShieldAlert } from "lucide-react";
import type { AppLogRow } from "../api";
import { Card, Button, DataRow, DataTable, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { cn } from "../lib/cn";

const levelFilters = ["all", "INFO", "WARN", "ERROR"] as const;

type LevelFilter = (typeof levelFilters)[number];


function logLevelClass(level: string) {
  const tone = level === "WARN" ? "bg-amber-50 text-amber-700" : level === "ERROR" ? "bg-red-50 text-red-600" : "bg-success-light/20 text-success";
  return `inline-flex min-w-14 justify-center rounded-full px-2.5 py-1.5 text-[11px] font-black ${tone}`;
}

function levelLabel(level: string) {
  if (level === "INFO") return "Info";
  if (level === "WARN") return "Peringatan";
  if (level === "ERROR") return "Error";
  return level;
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    pos: "Kasir POS",
    backup: "Cadangan Data",
    users: "User",
    agent: "Layanan Agen",
    debts: "Buku Utang",
    cash: "Kas & Saldo",
  };
  return labels[source] || source;
}

export function LogsPage({
  logs,
  onRefresh,
}: {
  logs: AppLogRow[];
  onRefresh: () => void;
}) {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const sources = useMemo(() => Array.from(new Set(logs.map((log) => log.source))).sort(), [logs]);
  const visibleLogs = useMemo(() => {
    return logs.filter((log) => {
      const levelMatches = levelFilter === "all" || log.level === levelFilter;
      const sourceMatches = sourceFilter === "all" || log.source === sourceFilter;
      return levelMatches && sourceMatches;
    });
  }, [levelFilter, logs, sourceFilter]);
  const infoCount = logs.filter((log) => log.level === "INFO").length;
  const warnCount = logs.filter((log) => log.level === "WARN").length;
  const errorCount = logs.filter((log) => log.level === "ERROR").length;

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Monitoring"
        title="Riwayat Aktivitas"
        description="Catatan aktivitas penting aplikasi untuk membantu pemeriksaan dan dukungan."
        actions={<Button variant="secondary" onClick={onRefresh}><RefreshCw size={16} /> Refresh</Button>}
      />

      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {levelFilters.map((level) => (
            <button
              key={level}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all",
                levelFilter === level
                  ? "gradient-primary text-white shadow-glow-primary"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100",
              )}
              onClick={() => setLevelFilter(level)}
            >
              {level === "all" ? "Semua Level" : levelLabel(level)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 mt-3">
          <button className={sourceFilter === "all" ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100"} onClick={() => setSourceFilter("all")}>Semua Sumber</button>
          {sources.map((source) => (
            <button key={source} className={sourceFilter === source ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100"} onClick={() => setSourceFilter(source)}>{sourceLabel(source)}</button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        {visibleLogs.length === 0 ? <EmptyState title="Belum ada aktivitas" description="Aktivitas penting akan muncul setelah aplikasi digunakan." /> : (
          <DataTable columns={["Level", "Sumber", "Pesan", "Waktu"]} template="110px 150px minmax(0,1fr) 190px" minWidth={640}>
            {visibleLogs.map((log) => (
              <DataRow key={log.id} template="110px 150px minmax(0,1fr) 190px">
                <span className={logLevelClass(log.level)}>{levelLabel(log.level)}</span>
                <span>{sourceLabel(log.source)}</span>
                <strong>{log.message}</strong>
                <small>{log.created_at}</small>
              </DataRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
