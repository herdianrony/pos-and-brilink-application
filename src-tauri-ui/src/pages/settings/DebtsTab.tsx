import { Download, Receipt } from "lucide-react";
import type { DebtRow } from "../../api";
import { formatRupiah } from "../../lib/format";
import { Button, Card, EmptyState } from "../../components/ui";
import { StatCards, statusBadge } from "./helpers";

export function DebtsTab({ debts, onExportCsv }: { debts: DebtRow[]; onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void }) {
  return (
    <div className="space-y-5" role="tabpanel" aria-label="Utang">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Receipt size={18} className="text-amber-500" /><h3 className="text-base font-extrabold text-slate-900">Ringkasan Utang</h3></div>
          <Button variant="secondary" size="sm" onClick={() => onExportCsv("utang-catatagen.csv", debts.map((d) => ({ pelanggan: d.customer_name, phone: d.phone, total: d.amount, terbayar: d.paid_amount, sisa: d.outstanding, status: d.status, catatan: d.notes })))}><Download size={14} /> Unduh CSV</Button>
        </div>
        <StatCards stats={[
          { label: "Total Utang", value: debts.length },
          { label: "Total Nominal", value: formatRupiah(debts.reduce((s, d) => s + d.amount, 0)) },
          { label: "Sudah Terbayar", value: formatRupiah(debts.reduce((s, d) => s + d.paid_amount, 0)) },
          { label: "Sisa Outstanding", value: formatRupiah(debts.reduce((s, d) => s + d.outstanding, 0)) },
        ]} />
        {debts.length === 0 ? <EmptyState compact title="Belum ada utang" /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm text-left"><caption className="sr-only">Daftar Utang</caption>
              <thead><tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider"><th className="py-3 pr-4">Pelanggan</th><th className="py-3 pr-4">Telepon</th><th className="py-3 pr-4 text-right">Total</th><th className="py-3 pr-4 text-right">Terbayar</th><th className="py-3 pr-4 text-right">Sisa</th><th className="py-3 text-center">Status</th></tr></thead>
              <tbody>{debts.slice(0, 50).map((d) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4 font-bold text-slate-900">{d.customer_name}</td>
                  <td className="py-3 pr-4 text-slate-600">{d.phone || "—"}</td>
                  <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatRupiah(d.amount)}</td>
                  <td className="py-3 pr-4 text-right text-emerald-600">{formatRupiah(d.paid_amount)}</td>
                  <td className="py-3 pr-4 text-right text-red-600 font-bold">{formatRupiah(d.outstanding)}</td>
                  <td className="py-3 text-center">{statusBadge(d.status)}</td>
                </tr>
              ))}</tbody>
            </table>
            {debts.length > 50 && <p className="text-xs text-slate-500 text-center pt-3">Menampilkan 50 dari {debts.length} utang</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
