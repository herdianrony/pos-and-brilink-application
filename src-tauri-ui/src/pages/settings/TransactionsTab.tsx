import { Download, Receipt } from "lucide-react";
import type { AccountMutationRow, TransactionRow } from "../../api";
import { formatRupiah } from "../../lib/format";
import { Button, Card, EmptyState } from "../../components/ui";
import { StatCards, statusBadge } from "./helpers";

export function TransactionsTab({ transactions, mutations, onExportCsv }: { transactions: TransactionRow[]; mutations: AccountMutationRow[]; onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void }) {
  return (
    <div className="space-y-5" role="tabpanel" aria-label="Transaksi">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Receipt size={18} className="text-emerald-500" /><h3 className="text-base font-extrabold text-slate-900">Ringkasan Transaksi</h3></div>
          <Button variant="secondary" size="sm" onClick={() => onExportCsv("transaksi-catatagen.csv", transactions.map((t) => ({ invoice: t.invoice_no, tipe: t.transaction_type, pelanggan: t.customer_name, total: t.total_amount, profit: t.profit, metode: t.payment_method, status: t.status, tanggal: t.created_at })))}><Download size={14} /> Unduh CSV</Button>
        </div>
        <StatCards stats={[
          { label: "Total Transaksi", value: transactions.length },
          { label: "Total Pendapatan", value: formatRupiah(transactions.reduce((s, t) => s + t.total_amount, 0)) },
          { label: "Total Profit", value: formatRupiah(transactions.reduce((s, t) => s + t.profit, 0)) },
          { label: "Mutasi Saldo", value: mutations.length },
        ]} />
        {transactions.length === 0 ? <EmptyState compact title="Belum ada transaksi" /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm text-left"><caption className="sr-only">Daftar Transaksi</caption>
              <thead><tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider"><th className="py-3 pr-4">Invoice</th><th className="py-3 pr-4">Tipe</th><th className="py-3 pr-4">Pelanggan</th><th className="py-3 pr-4 text-right">Total</th><th className="py-3 pr-4 text-right">Profit</th><th className="py-3 pr-4">Metode</th><th className="py-3 text-center">Status</th></tr></thead>
              <tbody>{transactions.slice(0, 50).map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4 font-bold text-slate-900">{t.invoice_no}</td>
                  <td className="py-3 pr-4 text-slate-600">{t.transaction_type}</td>
                  <td className="py-3 pr-4 text-slate-600">{t.customer_name || "—"}</td>
                  <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatRupiah(t.total_amount)}</td>
                  <td className="py-3 pr-4 text-right text-slate-600">{formatRupiah(t.profit)}</td>
                  <td className="py-3 pr-4 text-slate-600">{t.payment_method}</td>
                  <td className="py-3 text-center">{statusBadge(t.status)}</td>
                </tr>
              ))}</tbody>
            </table>
            {transactions.length > 50 && <p className="text-xs text-slate-500 text-center pt-3">Menampilkan 50 dari {transactions.length} transaksi</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
