import type { FormEvent } from "react";
import type { AccountMutationRow, BackupRow, DebtRow, ProductRow, PublicUser, TransactionRow } from "../api";

export function SettingsPage({
  users,
  userForm,
  saving,
  transactions,
  mutations,
  debts,
  products,
  backups,
  dbPath,
  onUserFormChange,
  onSubmitUser,
  onExportCsv,
  onCreateBackup,
  onRestoreBackup,
}: {
  users: PublicUser[];
  userForm: { name: string; username: string; password: string; role: "admin" | "kasir" };
  saving: boolean;
  transactions: TransactionRow[];
  mutations: AccountMutationRow[];
  debts: DebtRow[];
  products: ProductRow[];
  backups: BackupRow[];
  dbPath: string;
  onUserFormChange: (form: { name: string; username: string; password: string; role: "admin" | "kasir" }) => void;
  onSubmitUser: (event: FormEvent) => void;
  onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void;
  onCreateBackup: () => void;
  onRestoreBackup: (backup: BackupRow) => void;
}) {
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Sistem</p><h1>Pengaturan</h1></div></div>
      <section className="grid workspace-grid">
        <div className="card">
          <div className="card-header"><div><h2>Manajemen User</h2><p>Buat akun kasir agar staf tidak memakai akun owner.</p></div></div>
          <form onSubmit={onSubmitUser} className="product-form">
            <label>Nama<input value={userForm.name} onChange={(e) => onUserFormChange({ ...userForm, name: e.target.value })} /></label>
            <label>Username<input value={userForm.username} onChange={(e) => onUserFormChange({ ...userForm, username: e.target.value })} /></label>
            <label>Password<input type="password" value={userForm.password} onChange={(e) => onUserFormChange({ ...userForm, password: e.target.value })} /></label>
            <label>Role<select value={userForm.role} onChange={(e) => onUserFormChange({ ...userForm, role: e.target.value as "admin" | "kasir" })}>
              <option value="kasir">Kasir / Staff</option>
              <option value="admin">Owner / Admin</option>
            </select></label>
            <button type="submit" disabled={saving}>Buat User</button>
          </form>
          <div className="list">
            {users.map((item) => <div key={item.id} className="row rich-row"><div><strong>{item.name}</strong><small>{item.username}</small></div><span className="role-badge">{item.role}</span></div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div><h2>Export Data</h2><p>Export CSV ringan untuk arsip manual.</p></div></div>
          <div className="quick-actions export-actions">
            <button className="secondary" onClick={() => onExportCsv("transaksi-catatagen.csv", transactions.map((t) => ({ invoice: t.invoice_no, tipe: t.transaction_type, pelanggan: t.customer_name, total: t.total_amount, profit: t.profit, metode: t.payment_method, status: t.status, tanggal: t.created_at })))}>Export Transaksi</button>
            <button className="secondary" onClick={() => onExportCsv("mutasi-saldo-catatagen.csv", mutations.map((m) => ({ akun: m.account_name, tipe: m.mutation_type, nominal: m.amount, saldo_akhir: m.balance_after, catatan: m.notes, tanggal: m.created_at })))}>Export Mutasi</button>
            <button className="secondary" onClick={() => onExportCsv("utang-catatagen.csv", debts.map((d) => ({ pelanggan: d.customer_name, phone: d.phone, total: d.amount, terbayar: d.paid_amount, sisa: d.outstanding, status: d.status, catatan: d.notes })))}>Export Utang</button>
            <button className="secondary" onClick={() => onExportCsv("produk-catatagen.csv", products.map((p) => ({ nama: p.name, barcode: p.barcode, kategori: p.category_name, harga_beli: p.buy_price, harga_jual: p.sell_price, stok: p.stock, min_stok: p.min_stock })))}>Export Produk</button>
          </div>
          <div className="db-box"><strong>Database lokal</strong><span>{dbPath || "—"}</span></div>
        </div>
        <div className="card span-all">
          <div className="card-header"><div><h2>Backup & Restore</h2><p>Backup disimpan lokal di folder data aplikasi. Sebelum restore, aplikasi otomatis membuat backup cadangan.</p></div><button onClick={onCreateBackup} disabled={saving}>Buat Backup</button></div>
          {backups.length === 0 ? <div className="empty-state compact"><strong>Belum ada backup</strong><span>Klik Buat Backup untuk menyimpan salinan database.</span></div> : (
            <div className="backup-list">
              {backups.map((backup) => (
                <div key={backup.path} className="backup-row">
                  <div><strong>{backup.name}</strong><small>{backup.path}</small><small>{Math.ceil(backup.size / 1024)} KB</small></div>
                  <button className="secondary" onClick={() => onRestoreBackup(backup)} disabled={saving}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
