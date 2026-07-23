import { useState, type FormEvent } from "react";
import type { AppLogRow, BackupRow, CategoryRow, DebtRow, ProductRow, PublicUser, TransactionRow, AccountMutationRow } from "../api";
import { Tabs } from "../components/ui";
import { UsersTab } from "./settings/UsersTab";
import { ProductMasterPage } from "./ProductMasterPage";
import { DebtsTab } from "./settings/DebtsTab";
import { BackupTab } from "./settings/BackupTab";
import { AboutTab } from "./settings/AboutTab";
import { WhatsAppPage } from "./settings/WhatsAppTab";

const TAB_ITEMS = [
  { id: "pengguna", label: "Pengguna" },
  { id: "produk", label: "Produk" },
  { id: "utang", label: "Utang" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "backup", label: "Backup & Export" },
  { id: "tentang", label: "Tentang & Log" },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];

export function SettingsPage({
  users, userForm, saving, transactions, mutations, debts, products, categories, backups, dbPath, logs,
  onRefreshLogs, onUserFormChange, onSubmitUser, onExportCsv, onCreateBackup, onRestoreBackup, onMessage,
  onAddCategory, onAddProduct, onEditProduct, onRemoveProduct,
  // Debt management
  debtForm, debtPaymentForm, onDebtFormChange, onDebtPaymentFormChange, onSubmitDebt, onSubmitDebtPayment, onCopyDebtReminder,
}: {
  users: PublicUser[];
  userForm: { id: number; name: string; username: string; password: string; role: "admin" | "kasir" };
  saving: boolean;
  transactions: TransactionRow[];
  mutations: AccountMutationRow[];
  debts: DebtRow[];
  products: ProductRow[];
  categories: CategoryRow[];
  backups: BackupRow[];
  dbPath: string;
  logs: AppLogRow[];
  onRefreshLogs: () => void;
  onUserFormChange: (form: { id: number; name: string; username: string; password: string; role: "admin" | "kasir" }) => void;
  onSubmitUser: (event: FormEvent) => void;
  onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void;
  onCreateBackup: () => void;
  onRestoreBackup: (backup: BackupRow) => void;
  onMessage: (msg: string) => void;
  onAddCategory: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: ProductRow) => void;
  onRemoveProduct: (product: ProductRow) => void;
  // Debt management
  debtForm: { customer_name: string; phone: string; amount: string; notes: string };
  debtPaymentForm: { debt_id: string; amount: string; notes: string };
  onDebtFormChange: (form: { customer_name: string; phone: string; amount: string; notes: string }) => void;
  onDebtPaymentFormChange: (form: { debt_id: string; amount: string; notes: string }) => void;
  onSubmitDebt: (event: FormEvent) => void;
  onSubmitDebtPayment: (event: FormEvent) => void;
  onCopyDebtReminder: (debt: DebtRow) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("pengguna");

  function handleUserSubmit(form: { id: number; name: string; username: string; password: string; role: "admin" | "kasir" }) {
    onUserFormChange(form);
    setTimeout(() => onSubmitUser(new Event("submit") as unknown as FormEvent), 0);
  }

  function handleAddDebt(form: { customer_name: string; phone: string; amount: string; notes: string }) {
    onDebtFormChange(form);
    setTimeout(() => onSubmitDebt(new Event("submit") as unknown as FormEvent), 0);
  }

  function handlePayDebt(form: { debt_id: string; amount: string; notes: string }) {
    onDebtPaymentFormChange(form);
    setTimeout(() => onSubmitDebtPayment(new Event("submit") as unknown as FormEvent), 0);
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Pengaturan</h2>
        <p className="text-sm text-slate-500 mt-1">Kelola pengguna, produk, utang, WhatsApp, cadangan data, dan info aplikasi</p>
      </div>

      <Tabs items={[...TAB_ITEMS]} active={activeTab} onChange={(id) => setActiveTab(id as TabId)} ariaLabel="Tab pengaturan" />

      {activeTab === "pengguna" && <UsersTab users={users} saving={saving} onSubmitUser={handleUserSubmit} />}
      {activeTab === "produk" && (
        <ProductMasterPage
          categories={categories}
          products={products}
          onAddCategory={onAddCategory}
          onAddProduct={onAddProduct}
          onEditProduct={onEditProduct}
          onRemoveProduct={onRemoveProduct}
        />
      )}
      {activeTab === "utang" && <DebtsTab debts={debts} saving={saving} onExportCsv={onExportCsv} onAddDebt={handleAddDebt} onPayDebt={handlePayDebt} onCopyReminder={onCopyDebtReminder} />}
      {activeTab === "whatsapp" && <WhatsAppPage saving={saving} onMessage={onMessage} />}
      {activeTab === "backup" && <BackupTab transactions={transactions} mutations={mutations} debts={debts} products={products} backups={backups} saving={saving} onCreateBackup={onCreateBackup} onRestoreBackup={onRestoreBackup} onExportCsv={onExportCsv} />}
      {activeTab === "tentang" && <AboutTab dbPath={dbPath} logs={logs} onRefreshLogs={onRefreshLogs} />}
    </div>
  );
}
