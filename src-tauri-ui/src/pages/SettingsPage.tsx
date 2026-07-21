import type { FormEvent } from "react";
import { Archive, Database, Download, Shield, Users } from "lucide-react";
import type { AccountMutationRow, BackupRow, DebtRow, ProductRow, PublicUser, TransactionRow } from "../api";
import { Button, EmptyState, PageHeader, SectionCard } from "../components/ui";

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
    <div className="settings-page">
      <PageHeader eyebrow="Sistem" title="Pengaturan" description="Kelola pengguna, unduhan data, dan cadangan data lokal." />

      <section className="settings-grid">
        <SectionCard
          className="settings-card"
          title="Manajemen User"
          description="Buat akun kasir agar staf tidak memakai akun owner."
        >
          <div className="settings-card-icon"><Users size={22} /></div>
          <form onSubmit={onSubmitUser} className="product-form no-box settings-user-form">
            <label>Nama<input value={userForm.name} onChange={(e) => onUserFormChange({ ...userForm, name: e.target.value })} /></label>
            <label>Username<input value={userForm.username} onChange={(e) => onUserFormChange({ ...userForm, username: e.target.value })} /></label>
            <label>Password<input type="password" value={userForm.password} onChange={(e) => onUserFormChange({ ...userForm, password: e.target.value })} /></label>
            <label>Role<select value={userForm.role} onChange={(e) => onUserFormChange({ ...userForm, role: e.target.value as "admin" | "kasir" })}>
              <option value="kasir">Kasir / Staff</option>
              <option value="admin">Owner / Admin</option>
            </select></label>
            <button type="submit" disabled={saving}>Buat User</button>
          </form>
          <div className="settings-user-list">
            {users.map((item) => <div key={item.id} className="row rich-row"><div><strong>{item.name}</strong><small>{item.username}</small></div><span className="role-badge">{item.role}</span></div>)}
          </div>
        </SectionCard>

        <SectionCard className="settings-card" title="Unduh Data" description="Unduh CSV ringan untuk arsip manual atau olah data di spreadsheet.">
          <div className="settings-card-icon blue"><Download size={22} /></div>
          <div className="settings-action-grid">
            <Button variant="secondary" onClick={() => onExportCsv("transaksi-catatagen.csv", transactions.map((t) => ({ invoice: t.invoice_no, tipe: t.transaction_type, pelanggan: t.customer_name, total: t.total_amount, profit: t.profit, metode: t.payment_method, status: t.status, tanggal: t.created_at })))}>Unduh Transaksi</Button>
            <Button variant="secondary" onClick={() => onExportCsv("mutasi-saldo-catatagen.csv", mutations.map((m) => ({ akun: m.account_name, tipe: m.mutation_type, nominal: m.amount, saldo_akhir: m.balance_after, catatan: m.notes, tanggal: m.created_at })))}>Unduh Mutasi</Button>
            <Button variant="secondary" onClick={() => onExportCsv("utang-catatagen.csv", debts.map((d) => ({ pelanggan: d.customer_name, phone: d.phone, total: d.amount, terbayar: d.paid_amount, sisa: d.outstanding, status: d.status, catatan: d.notes })))}>Unduh Utang</Button>
            <Button variant="secondary" onClick={() => onExportCsv("produk-catatagen.csv", products.map((p) => ({ nama: p.name, barcode: p.barcode, kategori: p.category_name, harga_beli: p.buy_price, harga_jual: p.sell_price, stok: p.stock, min_stok: p.min_stock })))}>Unduh Produk</Button>
          </div>
        </SectionCard>

        <SectionCard
          className="settings-card span-all"
          title="Cadangkan & Pulihkan Data"
          description="Cadangan data disimpan di folder data aplikasi. Sebelum memulihkan data, aplikasi otomatis membuat cadangan terlebih dahulu."
          actions={<Button onClick={onCreateBackup} disabled={saving}>Cadangkan Data</Button>}
        >
          <div className="settings-card-icon amber"><Archive size={22} /></div>
          {backups.length === 0 ? <EmptyState compact title="Belum ada cadangan data" description="Klik Cadangkan Data untuk menyimpan salinan database." /> : (
            <div className="backup-list">
              {backups.map((backup) => (
                <div key={backup.path} className="backup-row">
                  <div><strong>{backup.name}</strong><small>{backup.path}</small><small>{Math.ceil(backup.size / 1024)} KB</small></div>
                  <Button variant="secondary" onClick={() => onRestoreBackup(backup)} disabled={saving}>Pulihkan</Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard className="settings-card span-all" title="Info Aplikasi" description="Informasi penyimpanan lokal dan status keamanan data.">
          <div className="settings-card-icon purple"><Database size={22} /></div>
          <div className="settings-info-grid">
            <div><Shield size={18} /><span>Data tersimpan lokal di perangkat ini.</span></div>
            <div><Database size={18} /><span className="break-all">{dbPath || "—"}</span></div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
