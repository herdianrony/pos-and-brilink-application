import { useEffect, useState, type FormEvent } from "react";
import { Activity, Archive, Database, Download, Printer, RefreshCw, Shield, Users } from "lucide-react";
import { printThermalReceipt, type AccountMutationRow, type AppLogRow, type BackupRow, type DebtRow, type ProductRow, type PublicUser, type TransactionRow } from "../api";
import { Button, EmptyState, PageHeader, SectionCard, Tabs } from "../components/ui";


function logLevelClass(level: string) {
  const tone = level === "WARN" ? "bg-amber-50 text-amber-700" : level === "ERROR" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700";
  return `inline-flex min-w-14 justify-center rounded-full px-2.5 py-1.5 text-[11px] font-black ${tone}`;
}

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
  const [activeTab, setActiveTab] = useState<"user" | "data" | "backup" | "printer" | "info" | "activity">("user");
  const [printerForm, setPrinterForm] = useState({ host: "", port: "9100", paper: "58" as "58" | "80" });
  const [printerStatus, setPrinterStatus] = useState("");

  useEffect(() => {
    setPrinterForm({
      host: localStorage.getItem("catatagen.printer.host") || "",
      port: localStorage.getItem("catatagen.printer.port") || "9100",
      paper: (localStorage.getItem("catatagen.printer.paper") as "58" | "80") || "58",
    });
  }, []);

  function savePrinterSettings() {
    localStorage.setItem("catatagen.printer.host", printerForm.host.trim());
    localStorage.setItem("catatagen.printer.port", printerForm.port.trim() || "9100");
    localStorage.setItem("catatagen.printer.paper", printerForm.paper);
    setPrinterStatus("Pengaturan printer disimpan.");
  }

  async function testPrinter() {
    const host = printerForm.host.trim();
    if (!host) {
      setPrinterStatus("Isi IP printer terlebih dahulu.");
      return;
    }
    savePrinterSettings();
    setPrinterStatus("Mengirim test print...");
    try {
      await printThermalReceipt({
        host,
        port: Number(printerForm.port || 9100),
        store_name: "CatatAgen Local",
        invoice_no: "TEST-PRINT",
        payment_method: "Test",
        total_amount: 0,
        items: [{ name: `Test Print ${printerForm.paper}mm`, quantity: 1, unit_price: 0, subtotal: 0 }],
      });
      setPrinterStatus("Test print berhasil dikirim.");
    } catch (error) {
      setPrinterStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Sistem" title="Pengaturan" description="Kelola pengguna, unduhan data, cadangan, dan aktivitas aplikasi." />
      <Tabs
        items={[
          { id: "user", label: "User" },
          { id: "data", label: "Data" },
          { id: "backup", label: "Backup" },
          { id: "printer", label: "Printer" },
          { id: "info", label: "Info" },
          { id: "activity", label: "Aktivitas" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Tab pengaturan"
      />

      <section className="grid grid-cols-2 gap-4 max-[920px]:grid-cols-1"> 
        {activeTab === "user" && <SectionCard
          className="relative overflow-hidden rounded-[28px]"
          title="Manajemen User"
          description="Buat akun kasir agar staf tidak memakai akun owner."
        >
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Users size={22} /></div>
          <form onSubmit={onSubmitUser} className="mb-5 grid grid-cols-2 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[640px]:grid-cols-1 [&_button]:col-span-full border-0 bg-transparent p-0 grid-cols-2 max-[640px]:grid-cols-1">
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Nama<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={userForm.name} onChange={(e) => onUserFormChange({ ...userForm, name: e.target.value })} /></label>
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Username<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={userForm.username} onChange={(e) => onUserFormChange({ ...userForm, username: e.target.value })} /></label>
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Password<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" type="password" value={userForm.password} onChange={(e) => onUserFormChange({ ...userForm, password: e.target.value })} /></label>
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Role<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={userForm.role} onChange={(e) => onUserFormChange({ ...userForm, role: e.target.value as "admin" | "kasir" })}>
              <option value="kasir">Kasir / Staff</option>
              <option value="admin">Owner / Admin</option>
            </select></label>
            <Button type="submit" disabled={saving}>Buat User</Button>
          </form>
          <div className="grid gap-2.5">
            {users.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block"><div><strong>{item.name}</strong><small>{item.username}</small></div><span className="inline-flex items-center justify-center rounded-full bg-indigo-50 px-2.5 py-1.5 text-xs font-black uppercase text-indigo-700">{item.role}</span></div>)}
          </div>
        </SectionCard>}

        {activeTab === "data" && <SectionCard className="relative overflow-hidden rounded-[28px] col-span-full" title="Unduh Data" description="Unduh CSV ringan untuk arsip manual atau olah data di spreadsheet.">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 bg-cyan-50 text-cyan-700"><Download size={22} /></div>
          <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
            <Button variant="secondary" onClick={() => onExportCsv("transaksi-catatagen.csv", transactions.map((t) => ({ invoice: t.invoice_no, tipe: t.transaction_type, pelanggan: t.customer_name, total: t.total_amount, profit: t.profit, metode: t.payment_method, status: t.status, tanggal: t.created_at })))}>Unduh Transaksi</Button>
            <Button variant="secondary" onClick={() => onExportCsv("mutasi-saldo-catatagen.csv", mutations.map((m) => ({ akun: m.account_name, tipe: m.mutation_type, nominal: m.amount, saldo_akhir: m.balance_after, catatan: m.notes, tanggal: m.created_at })))}>Unduh Mutasi</Button>
            <Button variant="secondary" onClick={() => onExportCsv("utang-catatagen.csv", debts.map((d) => ({ pelanggan: d.customer_name, phone: d.phone, total: d.amount, terbayar: d.paid_amount, sisa: d.outstanding, status: d.status, catatan: d.notes })))}>Unduh Utang</Button>
            <Button variant="secondary" onClick={() => onExportCsv("produk-catatagen.csv", products.map((p) => ({ nama: p.name, barcode: p.barcode, kategori: p.category_name, harga_beli: p.buy_price, harga_jual: p.sell_price, stok: p.stock, min_stok: p.min_stock })))}>Unduh Produk</Button>
          </div>
        </SectionCard>}

        {activeTab === "backup" && <SectionCard
          className="relative overflow-hidden rounded-[28px] col-span-full"
          title="Cadangkan & Pulihkan Data"
          description="Cadangan data disimpan di folder data aplikasi. Sebelum memulihkan data, aplikasi otomatis membuat cadangan terlebih dahulu."
          actions={<Button onClick={onCreateBackup} disabled={saving}>Cadangkan Data</Button>}
        >
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 bg-amber-50 text-amber-600"><Archive size={22} /></div>
          {backups.length === 0 ? <EmptyState compact title="Belum ada cadangan data" description="Klik Cadangkan Data untuk menyimpan salinan database." /> : (
            <div className="grid gap-2.5">
              {backups.map((backup) => (
                <div key={backup.path} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-3.5 max-[640px]:grid-cols-1 [&_div]:grid [&_div]:min-w-0 [&_div]:gap-1 [&_small]:truncate [&_small]:text-slate-500">
                  <div><strong>{backup.name}</strong><small>{backup.path}</small><small>{Math.ceil(backup.size / 1024)} KB</small></div>
                  <Button variant="secondary" onClick={() => onRestoreBackup(backup)} disabled={saving}>Pulihkan</Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>}


        {activeTab === "printer" && <SectionCard className="relative overflow-hidden rounded-[28px] col-span-full" title="Printer Thermal" description="Simpan printer ESC/POS network agar kasir tidak perlu mengetik IP setiap cetak struk.">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Printer size={22} /></div>
          <div className="grid grid-cols-3 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[760px]:grid-cols-1">
            <label className="grid gap-2 text-[13px] font-black text-slate-600">IP / Host Printer
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={printerForm.host} onChange={(event) => setPrinterForm({ ...printerForm, host: event.target.value })} placeholder="192.168.1.100" />
            </label>
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Port
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={printerForm.port} onChange={(event) => setPrinterForm({ ...printerForm, port: event.target.value })} placeholder="9100" />
            </label>
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Lebar Kertas
              <select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={printerForm.paper} onChange={(event) => setPrinterForm({ ...printerForm, paper: event.target.value as "58" | "80" })}>
                <option value="58">58mm</option>
                <option value="80">80mm</option>
              </select>
            </label>
            <div className="col-span-full flex flex-wrap gap-2">
              <Button onClick={savePrinterSettings}>Simpan Printer</Button>
              <Button variant="secondary" onClick={testPrinter}>Test Print</Button>
            </div>
          </div>
          {printerStatus && <div className="mt-3 rounded-2xl bg-emerald-50 px-3.5 py-3 text-sm font-extrabold text-emerald-800">{printerStatus}</div>}
          <p className="mt-3 text-sm font-semibold text-slate-500">Saat ini didukung printer thermal network ESC/POS via TCP port 9100. USB/COM akan ditambahkan tahap berikutnya.</p>
        </SectionCard>}

        {activeTab === "info" && <SectionCard className="relative overflow-hidden rounded-[28px] col-span-full" title="Info Aplikasi" description="Informasi penyimpanan lokal dan status keamanan data.">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 bg-teal-50 text-teal-700"><Database size={22} /></div>
          <div className="grid gap-2.5 [&_div]:flex [&_div]:items-center [&_div]:gap-3 [&_div]:rounded-2xl [&_div]:border [&_div]:border-slate-200 [&_div]:bg-slate-50 [&_div]:p-4 [&_div]:text-sm [&_div]:font-semibold [&_div]:text-slate-600 [&_svg]:flex-none [&_svg]:text-emerald-600">
            <div><Shield size={18} /><span>Data tersimpan lokal di perangkat ini.</span></div>
            <div><Database size={18} /><span className="break-all">{dbPath || "—"}</span></div>
          </div>
        </SectionCard>}

        {activeTab === "activity" && <SectionCard className="relative overflow-hidden rounded-[28px] col-span-full" title="Riwayat Aktivitas" description="Aktivitas penting yang tercatat di aplikasi." actions={<button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none hover:bg-slate-100" onClick={onRefreshLogs}><RefreshCw size={14} /> Refresh</button>}>
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 bg-cyan-50 text-cyan-700"><Activity size={22} /></div>
          {logs.length === 0 ? <EmptyState compact title="Belum ada aktivitas" description="Aktivitas penting akan muncul setelah aplikasi digunakan." /> : logs.slice(0, 20).map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block"><div><strong>{log.message}</strong><small>{log.source} • {log.created_at}</small></div><span className={logLevelClass(log.level)}>{log.level}</span></div>
          ))}
        </SectionCard>}
      </section>
    </div>
  );
}
