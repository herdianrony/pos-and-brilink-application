import { useState, type FormEvent } from "react";
import {
  Archive,
  Database,
  Download,
  Info,
  Package,
  RefreshCw,
  Receipt,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import type {
  AccountMutationRow,
  AppLogRow,
  BackupRow,
  DebtRow,
  ProductRow,
  PublicUser,
  TransactionRow,
} from "../api";
import { formatRupiah } from "../lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  Tabs,
} from "../components/ui";

/* ─── constants ─── */

const TAB_ITEMS = [
  { id: "pengguna", label: "Pengguna" },
  { id: "produk", label: "Produk" },
  { id: "transaksi", label: "Transaksi" },
  { id: "utang", label: "Utang" },
  { id: "backup", label: "Backup" },
  { id: "tentang", label: "Tentang" },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];

/* ─── helpers ─── */

function logLevelBadge(level: string) {
  if (level === "ERROR")
    return <Badge variant="danger">ERROR</Badge>;
  if (level === "WARN")
    return <Badge variant="warning">WARN</Badge>;
  return <Badge variant="success">INFO</Badge>;
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "lunas" || s === "selesai" || s === "completed")
    return <Badge variant="success">{status}</Badge>;
  if (s === "belum_bayar" || s === "belum_bayar_sebagian" || s === "pending")
    return <Badge variant="warning">{status}</Badge>;
  if (s === "batal" || s === "cancelled")
    return <Badge variant="danger">{status}</Badge>;
  return <Badge>{status}</Badge>;
}

/* ─── component ─── */

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
  logs,
  onRefreshLogs,
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
  logs: AppLogRow[];
  onRefreshLogs: () => void;
  onUserFormChange: (form: { name: string; username: string; password: string; role: "admin" | "kasir" }) => void;
  onSubmitUser: (event: FormEvent) => void;
  onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void;
  onCreateBackup: () => void;
  onRestoreBackup: (backup: BackupRow) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("pengguna");
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);

  /* ── user helpers ── */

  function startEditUser(u: PublicUser) {
    setEditingUser(u);
    onUserFormChange({ name: u.name, username: u.username, password: "", role: u.role as "admin" | "kasir" });
  }

  function cancelEditUser() {
    setEditingUser(null);
    onUserFormChange({ name: "", username: "", password: "", role: "kasir" });
  }

  /* ── tabs ── */

  const tabs = TAB_ITEMS.map((t) => ({ id: t.id, label: t.label }));

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          Pengaturan
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Kelola pengguna, produk, transaksi, utang, cadangan data, dan info aplikasi
        </p>
      </div>

      {/* ── Tab bar ── */}
      <Tabs
        items={tabs}
        active={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        ariaLabel="Tab pengaturan"
      />

      {/* ════════════════════════════════════════════
          TAB: Pengguna
      ════════════════════════════════════════════ */}
      {activeTab === "pengguna" && (
        <div className="space-y-5" role="tabpanel" aria-label="Pengguna">
          {/* Form */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-emerald-500" />
              <h3 className="text-base font-extrabold text-slate-900">
                {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              {editingUser
                ? `Mengedit: ${editingUser.name} — kosongkan password jika tidak ingin mengubah.`
                : "Buat akun kasir agar staf tidak memakai akun owner."}
            </p>

            <form
              onSubmit={(e) => {
                onSubmitUser(e);
                if (!saving) setEditingUser(null);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <Field label="Nama">
                <Input
                  value={userForm.name}
                  onChange={(e) => onUserFormChange({ ...userForm, name: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </Field>
              <Field label="Username">
                <Input
                  value={userForm.username}
                  onChange={(e) => onUserFormChange({ ...userForm, username: e.target.value })}
                  placeholder="Username login"
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => onUserFormChange({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Password"}
                />
              </Field>
              <Field label="Role">
                <Select
                  value={userForm.role}
                  onChange={(e) => onUserFormChange({ ...userForm, role: e.target.value as "admin" | "kasir" })}
                >
                  <option value="kasir">Kasir / Staff</option>
                  <option value="admin">Owner / Admin</option>
                </Select>
              </Field>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <span className="animate-spin">⏳</span>}
                  {editingUser ? "Simpan Perubahan" : "Buat Pengguna"}
                </Button>
                {editingUser && (
                  <Button type="button" variant="secondary" onClick={cancelEditUser}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* Table */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-emerald-500" />
              <h3 className="text-base font-extrabold text-slate-900">
                Daftar Pengguna
              </h3>
            </div>

            {users.length === 0 ? (
              <EmptyState compact title="Belum ada pengguna" description="Tambahkan pengguna pertama menggunakan form di atas." />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">Daftar Pengguna</caption>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 pr-4">Nama</th>
                      <th className="py-3 pr-4">Username</th>
                      <th className="py-3 pr-4">Role</th>
                      <th className="py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{u.username}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={u.role === "admin" ? "purple" : "default"}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            className="text-xs font-bold text-slate-500 hover:text-primary transition-colors mr-3"
                            onClick={() => startEditUser(u)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: Produk
      ════════════════════════════════════════════ */}
      {activeTab === "produk" && (
        <div className="space-y-5" role="tabpanel" aria-label="Produk">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-emerald-500" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Ringkasan Produk
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onExportCsv(
                    "produk-catatagen.csv",
                    products.map((p) => ({
                      nama: p.name,
                      barcode: p.barcode,
                      kategori: p.category_name,
                      harga_beli: p.buy_price,
                      harga_jual: p.sell_price,
                      stok: p.stock,
                      min_stok: p.min_stock,
                    })),
                  )
                }
              >
                <Download size={14} /> Unduh CSV
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Produk", value: products.length },
                { label: "Aktif", value: products.filter((p) => p.is_active).length },
                {
                  label: "Total Stok",
                  value: products.reduce((s, p) => s + p.stock, 0),
                },
                {
                  label: "Stok Rendah",
                  value: products.filter((p) => p.stock <= p.min_stock).length,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 text-center"
                >
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {products.length === 0 ? (
              <EmptyState compact title="Belum ada produk" />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">Daftar Produk</caption>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 pr-4">Nama</th>
                      <th className="py-3 pr-4">Kategori</th>
                      <th className="py-3 pr-4 text-right">Harga Beli</th>
                      <th className="py-3 pr-4 text-right">Harga Jual</th>
                      <th className="py-3 pr-4 text-right">Stok</th>
                      <th className="py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 50).map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{p.category_name || "—"}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">{formatRupiah(p.buy_price)}</td>
                        <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatRupiah(p.sell_price)}</td>
                        <td className="py-3 pr-4 text-right">
                          <span className={p.stock <= p.min_stock ? "text-red-600 font-bold" : "text-slate-600"}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {p.is_active ? (
                            <Badge variant="success">Aktif</Badge>
                          ) : (
                            <Badge variant="default">Nonaktif</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length > 50 && (
                  <p className="text-xs text-slate-400 text-center pt-3">
                    Menampilkan 50 dari {products.length} produk
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: Transaksi
      ════════════════════════════════════════════ */}
      {activeTab === "transaksi" && (
        <div className="space-y-5" role="tabpanel" aria-label="Transaksi">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-500" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Ringkasan Transaksi
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onExportCsv(
                    "transaksi-catatagen.csv",
                    transactions.map((t) => ({
                      invoice: t.invoice_no,
                      tipe: t.transaction_type,
                      pelanggan: t.customer_name,
                      total: t.total_amount,
                      profit: t.profit,
                      metode: t.payment_method,
                      status: t.status,
                      tanggal: t.created_at,
                    })),
                  )
                }
              >
                <Download size={14} /> Unduh CSV
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Transaksi",
                  value: transactions.length,
                },
                {
                  label: "Total Pendapatan",
                  value: formatRupiah(transactions.reduce((s, t) => s + t.total_amount, 0)),
                },
                {
                  label: "Total Profit",
                  value: formatRupiah(transactions.reduce((s, t) => s + t.profit, 0)),
                },
                {
                  label: "Mutasi Saldo",
                  value: mutations.length,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 text-center"
                >
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {transactions.length === 0 ? (
              <EmptyState compact title="Belum ada transaksi" />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">Daftar Transaksi</caption>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 pr-4">Invoice</th>
                      <th className="py-3 pr-4">Tipe</th>
                      <th className="py-3 pr-4">Pelanggan</th>
                      <th className="py-3 pr-4 text-right">Total</th>
                      <th className="py-3 pr-4 text-right">Profit</th>
                      <th className="py-3 pr-4">Metode</th>
                      <th className="py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 50).map((t) => (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-900">{t.invoice_no}</td>
                        <td className="py-3 pr-4 text-slate-600">{t.transaction_type}</td>
                        <td className="py-3 pr-4 text-slate-600">{t.customer_name || "—"}</td>
                        <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatRupiah(t.total_amount)}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">{formatRupiah(t.profit)}</td>
                        <td className="py-3 pr-4 text-slate-600">{t.payment_method}</td>
                        <td className="py-3 text-center">{statusBadge(t.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 50 && (
                  <p className="text-xs text-slate-400 text-center pt-3">
                    Menampilkan 50 dari {transactions.length} transaksi
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: Utang
      ════════════════════════════════════════════ */}
      {activeTab === "utang" && (
        <div className="space-y-5" role="tabpanel" aria-label="Utang">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Ringkasan Utang
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onExportCsv(
                    "utang-catatagen.csv",
                    debts.map((d) => ({
                      pelanggan: d.customer_name,
                      phone: d.phone,
                      total: d.amount,
                      terbayar: d.paid_amount,
                      sisa: d.outstanding,
                      status: d.status,
                      catatan: d.notes,
                    })),
                  )
                }
              >
                <Download size={14} /> Unduh CSV
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Utang", value: debts.length },
                {
                  label: "Total Nominal",
                  value: formatRupiah(debts.reduce((s, d) => s + d.amount, 0)),
                },
                {
                  label: "Sudah Terbayar",
                  value: formatRupiah(debts.reduce((s, d) => s + d.paid_amount, 0)),
                },
                {
                  label: "Sisa Outstanding",
                  value: formatRupiah(debts.reduce((s, d) => s + d.outstanding, 0)),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 text-center"
                >
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {debts.length === 0 ? (
              <EmptyState compact title="Belum ada utang" />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">Daftar Utang</caption>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 pr-4">Pelanggan</th>
                      <th className="py-3 pr-4">Telepon</th>
                      <th className="py-3 pr-4 text-right">Total</th>
                      <th className="py-3 pr-4 text-right">Terbayar</th>
                      <th className="py-3 pr-4 text-right">Sisa</th>
                      <th className="py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.slice(0, 50).map((d) => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-900">{d.customer_name}</td>
                        <td className="py-3 pr-4 text-slate-600">{d.phone || "—"}</td>
                        <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatRupiah(d.amount)}</td>
                        <td className="py-3 pr-4 text-right text-emerald-600">{formatRupiah(d.paid_amount)}</td>
                        <td className="py-3 pr-4 text-right text-red-600 font-bold">{formatRupiah(d.outstanding)}</td>
                        <td className="py-3 text-center">{statusBadge(d.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {debts.length > 50 && (
                  <p className="text-xs text-slate-400 text-center pt-3">
                    Menampilkan 50 dari {debts.length} utang
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: Backup
      ════════════════════════════════════════════ */}
      {activeTab === "backup" && (
        <div className="space-y-5" role="tabpanel" aria-label="Backup">
          {/* Create backup */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive size={18} className="text-amber-500" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Cadangkan & Pulihkan Data
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cadangan disimpan di folder data aplikasi. Sebelum memulihkan, cadangan otomatis dibuat.
                  </p>
                </div>
              </div>
              <Button onClick={onCreateBackup} disabled={saving}>
                {saving && <span className="animate-spin">⏳</span>}
                Cadangkan Data
              </Button>
            </div>

            {backups.length === 0 ? (
              <EmptyState
                compact
                title="Belum ada cadangan data"
                description="Klik Cadangkan Data untuk menyimpan salinan database."
              />
            ) : (
              <div className="space-y-2.5">
                {backups.map((b) => (
                  <div
                    key={b.path}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <div className="min-w-0 grid gap-0.5">
                      <p className="font-bold text-slate-900 truncate">{b.name}</p>
                      <p className="text-xs text-slate-400 truncate">{b.path}</p>
                      <p className="text-xs text-slate-500">{Math.ceil(b.size / 1024)} KB &middot; {b.created_at}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRestoreBackup(b)}
                      disabled={saving}
                    >
                      Pulihkan
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Export data */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Download size={18} className="text-cyan-500" />
              <h3 className="text-base font-extrabold text-slate-900">
                Unduh Data CSV
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              Unduh CSV ringan untuk arsip manual atau olah data di spreadsheet.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  onExportCsv(
                    "transaksi-catatagen.csv",
                    transactions.map((t) => ({
                      invoice: t.invoice_no,
                      tipe: t.transaction_type,
                      pelanggan: t.customer_name,
                      total: t.total_amount,
                      profit: t.profit,
                      metode: t.payment_method,
                      status: t.status,
                      tanggal: t.created_at,
                    })),
                  )
                }
              >
                <Download size={14} /> Transaksi
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  onExportCsv(
                    "mutasi-saldo-catatagen.csv",
                    mutations.map((m) => ({
                      akun: m.account_name,
                      tipe: m.mutation_type,
                      nominal: m.amount,
                      saldo_akhir: m.balance_after,
                      catatan: m.notes,
                      tanggal: m.created_at,
                    })),
                  )
                }
              >
                <Download size={14} /> Mutasi Saldo
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  onExportCsv(
                    "utang-catatagen.csv",
                    debts.map((d) => ({
                      pelanggan: d.customer_name,
                      phone: d.phone,
                      total: d.amount,
                      terbayar: d.paid_amount,
                      sisa: d.outstanding,
                      status: d.status,
                      catatan: d.notes,
                    })),
                  )
                }
              >
                <Download size={14} /> Utang
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  onExportCsv(
                    "produk-catatagen.csv",
                    products.map((p) => ({
                      nama: p.name,
                      barcode: p.barcode,
                      kategori: p.category_name,
                      harga_beli: p.buy_price,
                      harga_jual: p.sell_price,
                      stok: p.stock,
                      min_stok: p.min_stock,
                    })),
                  )
                }
              >
                <Download size={14} /> Produk
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: Tentang
      ════════════════════════════════════════════ */}
      {activeTab === "tentang" && (
        <div className="space-y-5" role="tabpanel" aria-label="Tentang">
          {/* App info */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Info size={18} className="text-emerald-500" />
              <h3 className="text-base font-extrabold text-slate-900">
                Info Aplikasi
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              Informasi penyimpanan lokal dan status keamanan data.
            </p>
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
          </Card>

          {/* Activity logs */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-cyan-500" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Riwayat Aktivitas
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={onRefreshLogs}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {logs.length === 0 ? (
              <EmptyState
                compact
                title="Belum ada aktivitas"
                description="Aktivitas penting akan muncul setelah aplikasi digunakan."
              />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">Riwayat Aktivitas</caption>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 pr-4">Level</th>
                      <th className="py-3 pr-4">Sumber</th>
                      <th className="py-3 pr-4">Pesan</th>
                      <th className="py-3 text-right">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 20).map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-4">{logLevelBadge(log.level)}</td>
                        <td className="py-3 pr-4 text-slate-600">{log.source}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-900">{log.message}</td>
                        <td className="py-3 text-right text-xs text-slate-400 whitespace-nowrap">{log.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length > 20 && (
                  <p className="text-xs text-slate-400 text-center pt-3">
                    Menampilkan 20 dari {logs.length} log
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}