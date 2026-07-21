import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Database, RefreshCw, ShieldAlert } from "lucide-react";
import type { AppLogRow } from "../api";
import { PageHeader, StatCard } from "../components/ui";

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
    <div className="logs-page">
      <PageHeader
        eyebrow="Monitoring"
        title="Riwayat Aktivitas"
        description="Catatan aktivitas penting aplikasi untuk membantu pemeriksaan dan dukungan."
        actions={<button className="secondary" onClick={onRefresh}><RefreshCw size={16} /> Refresh</button>}
      />

      <section className="electron-stat-grid logs-stat-grid">
        <StatCard tone="blue" icon={<Activity size={20} />} label="Total Aktivitas" value={logs.length} sub="catatan tersimpan" />
        <StatCard tone="green" icon={<CheckCircle size={20} />} label="Info" value={infoCount} sub="aktivitas normal" />
        <StatCard tone="amber" icon={<AlertTriangle size={20} />} label="Peringatan" value={warnCount} sub="perlu diperiksa" />
        <StatCard tone="purple" icon={<ShieldAlert size={20} />} label="Error" value={errorCount} sub="kendala teknis" />
      </section>

      <section className="logs-filter-card card">
        <div className="electron-tabs">
          {levelFilters.map((level) => (
            <button key={level} className={levelFilter === level ? "electron-tab active" : "electron-tab"} onClick={() => setLevelFilter(level)}>
              {level === "all" ? "Semua Level" : levelLabel(level)}
            </button>
          ))}
        </div>
        <div className="status-filter-row">
          <button className={sourceFilter === "all" ? "filter-chip active" : "filter-chip"} onClick={() => setSourceFilter("all")}>Semua Sumber</button>
          {sources.map((source) => (
            <button key={source} className={sourceFilter === source ? "filter-chip active" : "filter-chip"} onClick={() => setSourceFilter(source)}>{sourceLabel(source)}</button>
          ))}
        </div>
      </section>

      <section className="logs-layout">
        <div className="card logs-table-card">
          <div className="card-header"><div><h2>Daftar Aktivitas</h2><p>{visibleLogs.length} catatan sesuai filter.</p></div></div>
          {visibleLogs.length === 0 ? <div className="empty-state"><strong>Belum ada aktivitas</strong><span>Aktivitas penting akan muncul setelah aplikasi digunakan.</span></div> : (
            <div className="activity-table-like">
              <div className="activity-table-head"><span>Level</span><span>Sumber</span><span>Pesan</span><span>Waktu</span></div>
              {visibleLogs.map((log) => (
                <div key={log.id} className="activity-row-like">
                  <span className={`log-level ${log.level.toLowerCase()}`}>{levelLabel(log.level)}</span>
                  <span>{sourceLabel(log.source)}</span>
                  <strong>{log.message}</strong>
                  <small>{log.created_at}</small>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="card logs-side-card">
          <div className="card-header"><div><h2>Panduan Membaca</h2><p>Gunakan halaman ini saat butuh pemeriksaan aktivitas.</p></div></div>
          <div className="settings-info-grid">
            <div><CheckCircle size={18} /><span>Info berarti aktivitas normal seperti checkout atau user dibuat.</span></div>
            <div><AlertTriangle size={18} /><span>Peringatan berarti aktivitas penting seperti pemulihan data.</span></div>
            <div><Database size={18} /><span>Cadangan data dan pemulihan juga dicatat di sini.</span></div>
          </div>
        </aside>
      </section>
    </div>
  );
}
