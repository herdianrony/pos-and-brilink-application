import { useState, type FormEvent } from "react";
import type { AppLogRow, BackupRow, DebtRow, ProductRow, PublicUser, TransactionRow, AccountMutationRow } from "../api";
import { Tabs } from "../components/ui";
import { UsersTab } from "./settings/UsersTab";
import { ProductsTab } from "./settings/ProductsTab";
import { DebtsTab } from "./settings/DebtsTab";
import { BackupTab } from "./settings/BackupTab";
import { AboutTab } from "./settings/AboutTab";

const TAB_ITEMS = [
  { id: "pengguna", label: "Pengguna" },
  { id: "produk", label: "Produk" },
  { id: "utang", label: "Utang" },
  { id: "backup", label: "Backup & Export" },
  { id: "tentang", label: "Tentang & Log" },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];

export function SettingsPage({
  users, userForm, saving, transactions, mutations, debts, products, backups, dbPath, logs,
  onRefreshLogs, onUserFormChange, onSubmitUser, onExportCsv, onCreateBackup, onRestoreBackup,
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

  function handleUserSubmit(form: { name: string; username: string; password: string; role: "admin" | "kasir" }) {
    onUserFormChange(form);
    // Trigger the parent's submit via a synthetic event
    setTimeout(() => onSubmitUser(new Event("submit") as unknown as FormEvent), 0);
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Pengaturan</h2>
        <p className="text-sm text-slate-500 mt-1">Kelola pengguna, produk, utang, cadangan data, dan info aplikasi</p>
      </div>

      <Tabs items={[...TAB_ITEMS]} active={activeTab} onChange={(id) => setActiveTab(id as TabId)} ariaLabel="Tab pengaturan" />

      {activeTab === "pengguna" && <UsersTab users={users} saving={saving} onSubmitUser={handleUserSubmit} />}
      {activeTab === "produk" && <ProductsTab products={products} onExportCsv={onExportCsv} />}
      {activeTab === "utang" && <DebtsTab debts={debts} onExportCsv={onExportCsv} />}
      {activeTab === "backup" && <BackupTab transactions={transactions} mutations={mutations} debts={debts} products={products} backups={backups} saving={saving} onCreateBackup={onCreateBackup} onRestoreBackup={onRestoreBackup} onExportCsv={onExportCsv} />}
      {activeTab === "tentang" && <AboutTab dbPath={dbPath} logs={logs} onRefreshLogs={onRefreshLogs} />}
    </div>
  );
}
