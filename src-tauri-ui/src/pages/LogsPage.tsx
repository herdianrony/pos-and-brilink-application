import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Database, RefreshCw, ShieldAlert } from "lucide-react";
import type { AppLogRow } from "../api";
import { Card, Button, DataRow, DataTable, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";

const levelFilters = ["all", "INFO", "WARN", "ERROR"] as const;

type LevelFilter = (typeof levelFilters)[number];


function logLevelClass(level: string) {
  const tone = level === "WARN" ? "bg-amber-50 text-amber-700" : level === "ERROR" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700";
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

      <section className="mb-4 grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1 mb-0">
        <StatCard color="blue" icon={<Activity size={20} />} label="Total Aktivitas" value={logs.length} sub="catatan tersimpan" />
        <StatCard color="green" icon={<CheckCircle size={20} />} label="Info" value={infoCount} sub="aktivitas normal" />
        <StatCard color="amber" icon={<AlertTriangle size={20} />} label="Peringatan" value={warnCount} sub="perlu diperiksa" />
        <StatCard color="teal" icon={<ShieldAlert size={20} />} label="Error" value={errorCount} sub="kendala teknis" />
      </section>

      <Card className="grid gap-3 p-3">
        <div className="flex flex-wrap gap-2">
          {levelFilters.map((level) => (
            <button key={level} className={levelFilter === level ? "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none hover:translate-y-0 hover:bg-slate-100 hover:shadow-none"} onClick={() => setLevelFilter(level)}>
              {level === "all" ? "Semua Level" : levelLabel(level)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button className={sourceFilter === "all" ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100"} onClick={() => setSourceFilter("all")}>Semua Sumber</button>
          {sources.map((source) => (
            <button key={source} className={sourceFilter === source ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100"} onClick={() => setSourceFilter(source)}>{sourceLabel(source)}</button>
          ))}
        </div>
      </Card>

      <section className="grid grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)] items-start gap-4 max-[1080px]:grid-cols-1">
        <SectionCard className="min-w-0 rounded-[28px]" title="Daftar Aktivitas" description={`${visibleLogs.length} catatan sesuai filter.`}>
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
        </SectionCard>
        <SectionCard className="rounded-[28px]" title="Panduan Membaca" description="Gunakan halaman ini saat butuh pemeriksaan aktivitas.">
          <div className="grid gap-2.5 [&_div]:flex [&_div]:items-center [&_div]:gap-3 [&_div]:rounded-2xl [&_div]:border [&_div]:border-slate-200 [&_div]:bg-slate-50 [&_div]:p-4 [&_div]:text-sm [&_div]:font-semibold [&_div]:text-slate-600 [&_svg]:flex-none [&_svg]:text-emerald-600">
            <div><CheckCircle size={18} /><span>Info berarti aktivitas normal seperti checkout atau user dibuat.</span></div>
            <div><AlertTriangle size={18} /><span>Peringatan berarti aktivitas penting seperti pemulihan data.</span></div>
            <div><Database size={18} /><span>Cadangan data dan pemulihan juga dicatat di sini.</span></div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
