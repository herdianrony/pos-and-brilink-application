import { Archive, Download } from "lucide-react";
import type { AccountMutationRow, BackupRow, DebtRow, ProductRow, TransactionRow } from "../../api";
import { Button, Card, EmptyState } from "../../components/ui";

export function BackupTab({ transactions, mutations, debts, products, backups, saving, onCreateBackup, onRestoreBackup, onExportCsv }: {
  transactions: TransactionRow[]; mutations: AccountMutationRow[]; debts: DebtRow[]; products: ProductRow[];
  backups: BackupRow[]; saving: boolean;
  onCreateBackup: () => void; onRestoreBackup: (b: BackupRow) => void;
  onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void;
}) {
  return (
    <div className="space-y-5" role="tabpanel" aria-label="Backup">
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive size={18} className="text-amber-500" />
            <div><h3 className="text-base font-extrabold text-slate-900">Cadangkan & Pulihkan Data</h3><p className="text-xs text-slate-500 mt-0.5">Cadangan disimpan di folder data aplikasi.</p></div>
          </div>
          <Button onClick={onCreateBackup} disabled={saving}>{saving && <span className="animate-spin">⏳</span>}Cadangkan Data</Button>
        </div>
        {backups.length === 0 ? <EmptyState compact title="Belum ada cadangan data" /> : (
          <div className="space-y-2.5">{backups.map((b) => (
            <div key={b.path} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="min-w-0 grid gap-0.5"><p className="font-bold text-slate-900 truncate">{b.name}</p><p className="text-xs text-slate-500 truncate">{b.path}</p><p className="text-xs text-slate-500">{Math.ceil(b.size / 1024)} KB · {b.created_at}</p></div>
              <Button variant="secondary" size="sm" onClick={() => onRestoreBackup(b)} disabled={saving}>Pulihkan</Button>
            </div>
          ))}</div>
        )}
      </Card>
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1"><Download size={18} className="text-cyan-500" /><h3 className="text-base font-extrabold text-slate-900">Unduh Data CSV</h3></div>
        <p className="text-sm text-slate-500">Unduh CSV ringan untuk arsip manual atau olah data di spreadsheet.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => onExportCsv("transaksi-catatagen.csv", transactions.map((t) => ({ invoice: t.invoice_no, tipe: t.transaction_type, pelanggan: t.customer_name, total: t.total_amount, profit: t.profit, metode: t.payment_method, status: t.status, tanggal: t.created_at })))}><Download size={14} /> Transaksi</Button>
          <Button variant="secondary" onClick={() => onExportCsv("mutasi-saldo-catatagen.csv", mutations.map((m) => ({ akun: m.account_name, tipe: m.mutation_type, nominal: m.amount, saldo_akhir: m.balance_after, catatan: m.notes, tanggal: m.created_at })))}><Download size={14} /> Mutasi Saldo</Button>
          <Button variant="secondary" onClick={() => onExportCsv("utang-catatagen.csv", debts.map((d) => ({ pelanggan: d.customer_name, phone: d.phone, total: d.amount, terbayar: d.paid_amount, sisa: d.outstanding, status: d.status, catatan: d.notes })))}><Download size={14} /> Utang</Button>
          <Button variant="secondary" onClick={() => onExportCsv("produk-catatagen.csv", products.map((p) => ({ nama: p.name, barcode: p.barcode, kategori: p.category_name, harga_beli: p.buy_price, harga_jual: p.sell_price, stok: p.stock, min_stok: p.min_stock })))}><Download size={14} /> Produk</Button>
        </div>
      </Card>
    </div>
  );
}
