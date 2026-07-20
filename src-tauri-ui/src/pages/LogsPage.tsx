import type { AppLogRow } from "../api";

export function LogsPage({
  logs,
  onRefresh,
}: {
  logs: AppLogRow[];
  onRefresh: () => void;
}) {
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Monitoring</p><h1>Riwayat Aktivitas</h1></div><button className="secondary" onClick={onRefresh}>Refresh Log</button></div>
      <div className="page-help"><strong>Tujuan log:</strong><span>Melihat aktivitas penting seperti checkout, backup, pulihkan, dan pembuatan user.</span></div>
      <section className="card">
        {logs.length === 0 ? <div className="empty-state"><strong>Belum ada log</strong><span>Log akan muncul setelah ada aktivitas penting.</span></div> : (
          <div className="log-list">
            {logs.map((log) => (
              <div key={log.id} className="log-row">
                <span className={`log-level ${log.level.toLowerCase()}`}>{log.level}</span>
                <div><strong>{log.message}</strong><small>{log.source} • {log.created_at}</small></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
