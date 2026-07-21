import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Database, RefreshCw, ShieldAlert } from "lucide-react";
import type { AppLogRow } from "../api";
import { Card, Button, DataRow, DataTable, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { tw } from "../lib/tw";

const levelFilters = ["all", "INFO", "WARN", "ERROR"] as const;

type LevelFilter = (typeof levelFilters)[number];

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
    <div className={tw("logs-page")}>
      <PageHeader
        eyebrow="Monitoring"
        title="Riwayat Aktivitas"
        description="Catatan aktivitas penting aplikasi untuk membantu pemeriksaan dan dukungan."
        actions={<Button variant="secondary" onClick={onRefresh}><RefreshCw size={16} /> Refresh</Button>}
      />

      <section className={tw("electron-stat-grid logs-stat-grid")}>
        <StatCard tone="blue" icon={<Activity size={20} />} label="Total Aktivitas" value={logs.length} sub="catatan tersimpan" />
        <StatCard tone="green" icon={<CheckCircle size={20} />} label="Info" value={infoCount} sub="aktivitas normal" />
        <StatCard tone="amber" icon={<AlertTriangle size={20} />} label="Peringatan" value={warnCount} sub="perlu diperiksa" />
        <StatCard tone="purple" icon={<ShieldAlert size={20} />} label="Error" value={errorCount} sub="kendala teknis" />
      </section>

      <Card className={tw("logs-filter-card")}>
        <div className={tw("electron-tabs")}>
          {levelFilters.map((level) => (
            <button key={level} className={tw(levelFilter === level ? "electron-tab active" : "electron-tab")} onClick={() => setLevelFilter(level)}>
              {level === "all" ? "Semua Level" : levelLabel(level)}
            </button>
          ))}
        </div>
        <div className={tw("status-filter-row")}>
          <button className={tw(sourceFilter === "all" ? "filter-chip active" : "filter-chip")} onClick={() => setSourceFilter("all")}>Semua Sumber</button>
          {sources.map((source) => (
            <button key={source} className={tw(sourceFilter === source ? "filter-chip active" : "filter-chip")} onClick={() => setSourceFilter(source)}>{sourceLabel(source)}</button>
          ))}
        </div>
      </Card>

      <section className={tw("logs-layout")}>
        <SectionCard className={tw("logs-table-card")} title="Daftar Aktivitas" description={`${visibleLogs.length} catatan sesuai filter.`}>
          {visibleLogs.length === 0 ? <EmptyState title="Belum ada aktivitas" description="Aktivitas penting akan muncul setelah aplikasi digunakan." /> : (
            <DataTable columns={["Level", "Sumber", "Pesan", "Waktu"]} template="110px 150px minmax(0,1fr) 190px" minWidth={860}>
              {visibleLogs.map((log) => (
                <DataRow key={log.id} template="110px 150px minmax(0,1fr) 190px">
                  <span className={tw(`log-level ${log.level.toLowerCase()}`)}>{levelLabel(log.level)}</span>
                  <span>{sourceLabel(log.source)}</span>
                  <strong>{log.message}</strong>
                  <small>{log.created_at}</small>
                </DataRow>
              ))}
            </DataTable>
          )}
        </SectionCard>
        <SectionCard className={tw("logs-side-card")} title="Panduan Membaca" description="Gunakan halaman ini saat butuh pemeriksaan aktivitas.">
          <div className={tw("settings-info-grid")}>
            <div><CheckCircle size={18} /><span>Info berarti aktivitas normal seperti checkout atau user dibuat.</span></div>
            <div><AlertTriangle size={18} /><span>Peringatan berarti aktivitas penting seperti pemulihan data.</span></div>
            <div><Database size={18} /><span>Cadangan data dan pemulihan juga dicatat di sini.</span></div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
