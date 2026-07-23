import { Database, Info, RefreshCw, Shield } from "lucide-react";
import type { AppLogRow } from "../../api";
import { Card, EmptyState } from "../../components/ui";
import { logLevelBadge } from "./helpers";

export function AboutTab({ dbPath, logs, onRefreshLogs }: { dbPath: string; logs: AppLogRow[]; onRefreshLogs: () => void }) {
  return (
    <div className="space-y-5" role="tabpanel" aria-label="Tentang">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1"><Info size={18} className="text-emerald-500" /><h3 className="text-base font-extrabold text-slate-900">Info Aplikasi</h3></div>
        <p className="text-sm text-slate-500">Informasi penyimpanan lokal dan status keamanan data.</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600"><Shield size={18} className="text-emerald-500 flex-none" /><span>Data tersimpan lokal di perangkat ini.</span></div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600"><Database size={18} className="text-emerald-500 flex-none" /><span className="break-all">{dbPath || "—"}</span></div>
        </div>
      </Card>
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><RefreshCw size={18} className="text-cyan-500" /><h3 className="text-base font-extrabold text-slate-900">Riwayat Aktivitas</h3></div>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors" onClick={onRefreshLogs}><RefreshCw size={13} /> Refresh</button>
        </div>
        {logs.length === 0 ? <EmptyState compact title="Belum ada aktivitas" /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm text-left"><caption className="sr-only">Riwayat Aktivitas</caption>
              <thead><tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider"><th className="py-3 pr-4">Level</th><th className="py-3 pr-4">Sumber</th><th className="py-3 pr-4">Pesan</th><th className="py-3 text-right">Waktu</th></tr></thead>
              <tbody>{logs.slice(0, 20).map((log) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4">{logLevelBadge(log.level)}</td>
                  <td className="py-3 pr-4 text-slate-600">{log.source}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{log.message}</td>
                  <td className="py-3 text-right text-xs text-slate-500 whitespace-nowrap">{log.created_at}</td>
                </tr>
              ))}</tbody>
            </table>
            {logs.length > 20 && <p className="text-xs text-slate-500 text-center pt-3">Menampilkan 20 dari {logs.length} log</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
