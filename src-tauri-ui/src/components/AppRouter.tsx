import type { AccountMutationRow, AccountRow, CategoryRow, DebtRow, ProductRow, TransactionRow } from "../api";
import { DashboardPage } from "../pages/DashboardPage";
import { POSPage } from "../pages/POSPage";
import { AgentServicesPage } from "../pages/AgentServicesPage";
import { HistoryPage } from "../pages/HistoryPage";
import { KeuanganPage } from "../pages/KeuanganPage";
import { SettingsPage } from "../pages/SettingsPage";
import type { ViewKey } from "../types";
import type { PublicUser, AppLogRow, BackupRow } from "../api";
import type { FormEvent } from "react";

export function AppRouter({
  activeView,
  user,
  saving,
  accounts,
  accountMutations,
  categories,
  products,
  filteredProducts,
  filteredTransactions,
  debts,
  users,
  backups,
  appLogs,
  transactions,
  totalCash,
  lowStockCount,
  loading,
  dbPath,
  // POS props
  cart,
  cartTotal,
  paymentMethod,
  settlementAccountId,
  settlementAccounts,
  posCategoryFilter,
  onCategoryFilterChange,
  onAddToCart,
  onAddAgentService,
  onUpdateQty,
  onPaymentMethodChange,
  onSettlementAccountChange,
  onHoldCart,
  onClearCart,
  onSubmitCheckout,
  // Agent props
  agentForm,
  agentStep,
  onAgentFormChange,
  onAgentStepChange,
  onApplyPreset,
  onSubmitAgentTransaction,
  // Transaction detail props
  selectedTransaction,
  selectedTransactionItems,
  onOpenDetail,
  // Settings props
  userForm,
  onUserFormChange,
  onSubmitUser,
  onExportCsv,
  onCreateBackup,
  onRestoreBackup,
  onRefreshLogs,
  onMessage,
  onRefreshApp,
  onAddCategory,
  onAddProduct,
  onEditProduct,
  onRemoveProduct,
}: {
  activeView: ViewKey;
  user: PublicUser;
  saving: boolean;
  accounts: AccountRow[];
  accountMutations: AccountMutationRow[];
  categories: CategoryRow[];
  products: ProductRow[];
  filteredProducts: ProductRow[];
  filteredTransactions: TransactionRow[];
  debts: DebtRow[];
  users: PublicUser[];
  backups: BackupRow[];
  appLogs: AppLogRow[];
  transactions: TransactionRow[];
  totalCash: number;
  lowStockCount: number;
  loading: boolean;
  dbPath: string;
  // POS
  cart: any[];
  cartTotal: number;
  paymentMethod: "cash" | "transfer" | "qris";
  settlementAccountId: string;
  settlementAccounts: AccountRow[];
  posCategoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  onAddToCart: (p: ProductRow) => void;
  onAddAgentService: (s: any) => void;
  onUpdateQty: (id: number, qty: number) => void;
  onPaymentMethodChange: (m: "cash" | "transfer" | "qris") => void;
  onSettlementAccountChange: (v: string) => void;
  onHoldCart: () => void;
  onClearCart: () => void;
  onSubmitCheckout: (cash?: number) => void;
  // Agent
  agentForm: any;
  agentStep: 1 | 2 | 3;
  onAgentFormChange: (f: any) => void;
  onAgentStepChange: (s: 1 | 2 | 3) => void;
  onApplyPreset: (k: string) => void;
  onSubmitAgentTransaction: (e: FormEvent) => void;
  // Transaction detail
  selectedTransaction: any;
  selectedTransactionItems: any[];
  onOpenDetail: (id: number) => void;
  // Settings
  userForm: any;
  onUserFormChange: (f: any) => void;
  onSubmitUser: (e: FormEvent) => void;
  onExportCsv: (filename: string, rows: any[]) => void;
  onCreateBackup: () => void;
  onRestoreBackup: (b: BackupRow) => void;
  onRefreshLogs: () => void;
  onMessage: (msg: string) => void;
  onRefreshApp: () => void;
  onAddCategory: () => void;
  onAddProduct: () => void;
  onEditProduct: (p: ProductRow) => void;
  onRemoveProduct: (p: ProductRow) => void;
}) {
  switch (activeView) {
    case "pos":
      return (
        <POSPage
          categories={categories}
          products={filteredProducts}
          cart={cart}
          cartTotal={cartTotal}
          paymentMethod={paymentMethod}
          settlementAccountId={settlementAccountId}
          settlementAccounts={settlementAccounts}
          saving={saving}
          posCategoryFilter={posCategoryFilter}
          onCategoryFilterChange={onCategoryFilterChange}
          onAddToCart={onAddToCart}
          onAddAgentService={onAddAgentService}
          onUpdateQty={onUpdateQty}
          onPaymentMethodChange={onPaymentMethodChange}
          onSettlementAccountChange={onSettlementAccountChange}
          onHoldCart={onHoldCart}
          onClearCart={onClearCart}
          onSubmitCheckout={onSubmitCheckout}
        />
      );
    case "brilink":
      return (
        <AgentServicesPage
          accounts={accounts}
          transactions={transactions}
          agentForm={agentForm}
          agentStep={agentStep}
          saving={saving}
          onAgentFormChange={onAgentFormChange}
          onAgentStepChange={onAgentStepChange}
          onApplyPreset={onApplyPreset}
          onSubmitAgentTransaction={onSubmitAgentTransaction}
        />
      );
    case "history":
      return (
        <HistoryPage
          transactions={filteredTransactions}
          selectedTransaction={selectedTransaction}
          selectedTransactionItems={selectedTransactionItems}
          onOpenDetail={onOpenDetail}
        />
      );
    case "keuangan":
      return (
        <KeuanganPage
          accounts={accounts}
          mutations={accountMutations}
          transactions={filteredTransactions}
          saving={saving}
          onAddAccount={() => {}}
          onTransfer={() => {}}
          onAdjust={() => {}}
          onOwnerDraw={() => {}}
          onBankFee={() => {}}
          onExportCsv={onExportCsv}
        />
      );
    case "settings":
      return (
        <SettingsPage
          users={users}
          userForm={userForm}
          saving={saving}
          transactions={transactions}
          mutations={accountMutations}
          debts={debts}
          products={products}
          categories={categories}
          backups={backups}
          dbPath={dbPath}
          logs={appLogs}
          onRefreshLogs={onRefreshLogs}
          onUserFormChange={onUserFormChange}
          onSubmitUser={onSubmitUser}
          onExportCsv={onExportCsv}
          onCreateBackup={onCreateBackup}
          onRestoreBackup={onRestoreBackup}
          onMessage={onMessage}
          onAddCategory={onAddCategory}
          onAddProduct={onAddProduct}
          onEditProduct={onEditProduct}
          onRemoveProduct={onRemoveProduct}
        />
      );
    case "dashboard":
    default:
      return (
        <DashboardPage
          accounts={accounts}
          products={products}
          transactions={filteredTransactions}
          totalCash={totalCash}
          lowStockCount={lowStockCount}
          loading={loading}
          onRefresh={onRefreshApp}
        />
      );
  }
}
