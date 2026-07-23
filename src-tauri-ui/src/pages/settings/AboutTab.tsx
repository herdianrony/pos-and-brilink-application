import { useMemo, useState } from "react";
import { Database, Info, RefreshCw, Shield, ChevronDown, ChevronUp } from "lucide-react";
import type { AppLogRow } from "../../api";
import { Badge, Card, ChipTabs, EmptyState } from "../../components/ui";
import { logLevelBadge } from "./helpers";

type LogLevel = "all" | "INFO" | "WARN" | "ERROR";

export function AboutTab({ dbPath, logs, onRefreshLogs }: { dbPath: string; logs: AppLogRow[]; onRefreshLogs: () => void }) {
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [showAll, setShowAll] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(true);

  const filteredLogs = useMemo(() => {
    if (levelFilter === "all") return logs;
    return logs.filter((l) => l.level === levelFilter);
  }, [logs, levelFilter]);

  const visibleLogs = showAll ? filteredLogs : filteredLogs.slice(0, 20);
  const errorCount = logs.filter((l) => l.level === "ERROR").length;
  const warnCount = logs.filter((l) => l.level === "WARN").length;

  return (
    <div className="space-y-5" role="tabpanel" aria-label="Tentang & Log">
      {/* App Info — collapsible */}
      <Card className="p-5 space-y-4">
        <button
          type="button"
          className="flex items-center justify-between w-full"
          onClick={() => setInfoExpanded(!infoExpanded)}
        >
          <div className="flex items-center gap-2">
            <Info size={18} className="text-emerald-500" />
            <h3 className="text-base font-extrabold text-slate-900">Info Aplikasi</h3>
          </div>
          {infoExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>
        {infoExpanded && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              <Shield size={18} className="text-emerald-500 flex-none" />
              <span>Data tersimpan lokal di perangkat ini.</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              <Database size={18} className="text-emerald-500 flex-none" />
              <span className="break-all">{dbPath || "—"}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Audit Log */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-cyan-500" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Audit Log</h3>
              <p className="text-xs text-slate-500">{logs.length} catatan{errorCount > 0 && ` · ${errorCount} error`}{warnCount > 0 && ` · ${warnCount} peringatan`}</p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onRefreshLogs}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <ChipTabs
          ariaLabel="Filter level log"
          items={[
            { id: "all", label: `Semua (${logs.length})` },
            { id: "INFO", label: "Info" },
            { id: "WARN", label: `Warning (${warnCount})` },
            { id: "ERROR", label: `Error (${errorCount})` },
          ]}
          active={levelFilter}
          onChange={(id) => { setLevelFilter(id as LogLevel); setShowAll(false); }}
        />

        {filteredLogs.length === 0 ? (
          <EmptyState compact title="Tidak ada log" description="Tidak ada catatan sesuai filter." />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm text-left">
                <caption className="sr-only">Audit Log</caption>
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 pr-4 w-20">Level</th>
                    <th className="py-3 pr-4 w-28">Sumber</th>
                    <th className="py-3 pr-4">Pesan</th>
                    <th className="py-3 text-right w-40">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pr-4">{logLevelBadge(log.level)}</td>
                      <td className="py-3 pr-4 text-slate-600 font-medium">{log.source}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{log.message}</td>
                      <td className="py-3 text-right text-xs text-slate-500 whitespace-nowrap">{log.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > 20 && !showAll && (
              <button
                type="button"
                className="w-full text-center text-sm font-bold text-primary hover:underline py-2"
                onClick={() => setShowAll(true)}
              >
                Tampilkan semua {filteredLogs.length} log
              </button>
            )}
            {showAll && filteredLogs.length > 20 && (
              <button
                type="button"
                className="w-full text-center text-sm font-bold text-primary hover:underline py-2"
                onClick={() => setShowAll(false)}
              >
                Tampilkan lebih sedikit
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
