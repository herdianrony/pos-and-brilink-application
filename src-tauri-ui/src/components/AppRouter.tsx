import type { AccountMutationRow, AccountRow, BackupRow, CategoryRow, DebtRow, ProductRow, PublicUser, TransactionRow, AppLogRow } from "../api";
import type { CartItem, AgentCartItem, AgentForm, ViewKey } from "../types";
import type { TransactionItemRow } from "../api";
import type { FormEvent } from "react";
import { DashboardPage } from "../pages/DashboardPage";
import { POSPage } from "../pages/POSPage";
import { AgentServicesPage } from "../pages/AgentServicesPage";
import { HistoryPage } from "../pages/HistoryPage";
import { KeuanganPage } from "../pages/KeuanganPage";
import { SettingsPage } from "../pages/SettingsPage";

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
  onTransactionAction,
  // Settings props
  userForm,
  onUserFormChange,
  onSubmitUser,
  onExportCsv,
  onAddAccount,
  onTransfer,
  onAdjust,
  onOwnerDraw,
  onBankFee,
  onCreateBackup,
  onRestoreBackup,
  onRefreshLogs,
  onMessage,
  onRefreshApp,
  onAddCategory,
  onAddProduct,
  onEditProduct,
  onRemoveProduct,
  // Debt management props
  debtForm,
  debtPaymentForm,
  onDebtFormChange,
  onDebtPaymentFormChange,
  onSubmitDebt,
  onSubmitDebtPayment,
  onCopyDebtReminder,
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
  cart: CartItem[];
  cartTotal: number;
  paymentMethod: "cash" | "transfer" | "qris";
  settlementAccountId: string;
  settlementAccounts: AccountRow[];
  posCategoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  onAddToCart: (p: ProductRow) => void;
  onAddAgentService: (s: Omit<AgentCartItem, "type" | "id">) => void;
  onUpdateQty: (id: number, qty: number) => void;
  onPaymentMethodChange: (m: "cash" | "transfer" | "qris") => void;
  onSettlementAccountChange: (v: string) => void;
  onHoldCart: () => void;
  onClearCart: () => void;
  onSubmitCheckout: (cash?: number) => void;
  // Agent
  agentForm: AgentForm;
  agentStep: 1 | 2 | 3;
  onAgentFormChange: (f: AgentForm) => void;
  onAgentStepChange: (s: 1 | 2 | 3) => void;
  onApplyPreset: (k: "withdraw" | "deposit" | "transfer" | "payment") => void;
  onSubmitAgentTransaction: (e: FormEvent) => void;
  // Transaction detail
  selectedTransaction: TransactionRow | null;
  selectedTransactionItems: TransactionItemRow[];
  onOpenDetail: (transaction: TransactionRow) => void;
  onTransactionAction: (id: number, action: "void" | "reverse" | "complete", reason: string) => Promise<void>;
  // Settings
  userForm: { name: string; username: string; password: string; role: "admin" | "kasir" };
  onUserFormChange: (f: { name: string; username: string; password: string; role: "admin" | "kasir" }) => void;
  onSubmitUser: (e: FormEvent) => void;
  onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void;
  onAddAccount: () => void;
  onTransfer: (account?: AccountRow) => void;
  onAdjust: (account: AccountRow) => void;
  onOwnerDraw: (account: AccountRow) => void;
  onBankFee: (account: AccountRow) => void;
  onCreateBackup: () => void;
  onRestoreBackup: (b: BackupRow) => void;
  onRefreshLogs: () => void;
  onMessage: (msg: string) => void;
  onRefreshApp: () => void;
  onAddCategory: () => void;
  onAddProduct: () => void;
  onEditProduct: (p: ProductRow) => void;
  onRemoveProduct: (p: ProductRow) => void;
  // Debt management
  debtForm: { customer_name: string; phone: string; amount: string; notes: string };
  debtPaymentForm: { debt_id: string; amount: string; notes: string };
  onDebtFormChange: (f: { customer_name: string; phone: string; amount: string; notes: string }) => void;
  onDebtPaymentFormChange: (f: { debt_id: string; amount: string; notes: string }) => void;
  onSubmitDebt: (e: FormEvent) => void;
  onSubmitDebtPayment: (e: FormEvent) => void;
  onCopyDebtReminder: (debt: DebtRow) => void;
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
          onTransactionAction={onTransactionAction}
          saving={saving}
        />
      );
    case "keuangan":
      return (
        <KeuanganPage
          accounts={accounts}
          mutations={accountMutations}
          transactions={filteredTransactions}
          saving={saving}
          onAddAccount={onAddAccount}
          onTransfer={onTransfer}
          onAdjust={onAdjust}
          onOwnerDraw={onOwnerDraw}
          onBankFee={onBankFee}
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
          debtForm={debtForm}
          debtPaymentForm={debtPaymentForm}
          onDebtFormChange={onDebtFormChange}
          onDebtPaymentFormChange={onDebtPaymentFormChange}
          onSubmitDebt={onSubmitDebt}
          onSubmitDebtPayment={onSubmitDebtPayment}
          onCopyDebtReminder={onCopyDebtReminder}
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
