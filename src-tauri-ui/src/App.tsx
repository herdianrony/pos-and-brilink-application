import { useEffect, useState, useCallback } from "react";
import type { AccountRow, ProductRow } from "./api";
import { transactionAction } from "./api";
import { ProductDialogs } from "./components/ProductDialogs";
import { ReceiptModal } from "./components/ReceiptModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRouter } from "./components/AppRouter";
import { useAppData } from "./hooks/useAppData";
import { usePosCart } from "./hooks/usePosCart";
import { useProductMaster } from "./hooks/useProductMaster";
import { useDebtBook } from "./hooks/useDebtBook";
import { useCashActions } from "./hooks/useCashActions";
import { useAgentTransaction } from "./hooks/useAgentTransaction";
import { useBackupRestore } from "./hooks/useBackupRestore";
import { useAuth } from "./hooks/useAuth";
import { useTransactionDetail } from "./hooks/useTransactionDetail";
import { AppShell } from "./components/layout/AppShell";
import { AuthShell } from "./components/AuthShell";
import { CashDialogs } from "./components/CashDialogs";
import { formatRupiah } from "./lib/format";
import { exportCsvFile } from "./lib/csv";
import type { ViewKey } from "./types";

const ADMIN_ONLY_VIEWS = new Set<ViewKey>(["finance", "settings"]);

function canAccess(view: ViewKey, role: string) {
  if (!ADMIN_ONLY_VIEWS.has(view)) return true;
  return role === "admin";
}

export default function App() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const appData = useAppData(setMessage);
  const {
    loading,
    dbPath,
    setupNeeded,
    setSetupNeeded,
    accounts,
    accountMutations,
    categories,
    products,
    transactions,
    debts,
    users,
    backups,
    appLogs,
    refreshData,
    bootstrap,
  } = appData;
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const auth = useAuth({
    saving,
    setSaving,
    onRefresh: refreshData,
    onMessage: setMessage,
    onSetupComplete: () => setSetupNeeded(false),
    onNavigate: setActiveView,
  });
  const {
    user,
    showAuthPassword,
    setShowAuthPassword,
    setupForm,
    setSetupForm,
    loginForm,
    setLoginForm,
    userForm,
    setUserForm,
    submitSetup,
    submitLogin,
    submitUser,
    logout,
    restoreSession,
  } = auth;
  const [posCategoryFilter, setPosCategoryFilter] = useState("all");
  const posCart = usePosCart({ onMessage: setMessage, onRefresh: refreshData });
  const {
    cart,
    cartTotal,
    lastReceipt,
    setLastReceipt,
    paymentMethod,
    setPaymentMethod,
    settlementAccountId,
    setSettlementAccountId,
    addToCart: addProductToCart,
    updateCartQty,
    removeCartItem,
    clearCart: clearPosCart,
    holdCart: holdPosCart,
    submitCheckout: submitPosCheckout,
  } = posCart;

  const productMaster = useProductMaster({
    saving,
    setSaving,
    onRefresh: refreshData,
    onMessage: setMessage,
    onNavigateProducts: () => setActiveView("settings"),
  });
  const {
    showProductModal,
    setShowProductModal,
    showCategoryModal,
    setShowCategoryModal,
    editingProductId,
    categoryForm,
    setCategoryForm,
    productForm,
    setProductForm,
    submitCategory,
    submitProduct,
    clearProductForm,
    openAddProduct,
    startEditProduct,
    removeProduct,
  } = productMaster;

  const debtBook = useDebtBook({
    saving,
    setSaving,
    onRefresh: refreshData,
    onMessage: setMessage,
  });
  const {
    debtForm,
    setDebtForm,
    debtPaymentForm,
    setDebtPaymentForm,
    submitDebt,
    submitDebtPayment,
    copyDebtReminder,
  } = debtBook;
  const cashActions = useCashActions({
    saving,
    setSaving,
    onRefresh: refreshData,
    onMessage: setMessage,
  });
  const {
    cashModal,
    setCashModal,
    accountForm,
    setAccountForm,
    adjustForm,
    setAdjustForm,
    transferForm,
    setTransferForm,
    ownerDrawForm,
    setOwnerDrawForm,
    bankFeeForm,
    setBankFeeForm,
    openAddAccount,
    openTransfer,
    openAdjust,
    openOwnerDraw,
    openBankFee,
    submitAccount,
    submitAdjustment,
    submitTransfer,
    submitOwnerDraw,
    submitBankFee,
  } = cashActions;

  const agentTransaction = useAgentTransaction({
    saving,
    setSaving,
    onRefresh: refreshData,
    onMessage: setMessage,
  });
  const {
    agentForm,
    setAgentForm,
    agentStep,
    setAgentStep,
    applyAgentPreset,
    submitAgentTransaction,
  } = agentTransaction;

  const { handleCreateBackup, handleRestoreBackup } = useBackupRestore({
    saving,
    setSaving,
    onRefresh: refreshData,
    onMessage: setMessage,
  });

  const transactionDetail = useTransactionDetail(setMessage);
  const { selectedTransaction, selectedTransactionItems, openTransactionDetail } = transactionDetail;

  const settlementAccounts = accounts.filter((account) => account.code !== "cash");
  const totalCash = accounts.reduce((sum, account) => sum + account.balance, 0);
  const lowStockCount = products.filter((product) => product.stock <= product.min_stock).length;
  const filteredProducts = posCategoryFilter === "all"
    ? products
    : products.filter((product) => String(product.category_id || "") === posCategoryFilter);
  const filteredTransactions = transactions;
  const filteredDebts = debts;

  useEffect(() => {
    (async () => {
      await bootstrap();
      // Try to restore session from localStorage
      try {
        await restoreSession();
      } catch {
        // No valid session — user will see login screen
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settlementAccountId) {
      const firstBank = accounts.find((account) => account.code !== "cash");
      if (firstBank) setSettlementAccountId(String(firstBank.id));
    }
  }, [accounts, settlementAccountId, setSettlementAccountId]);

  // Role guard: redirect if user can't access current view
  useEffect(() => {
    if (user && !canAccess(activeView, user.role)) {
      setActiveView("dashboard");
    }
  }, [user, activeView]);

  async function refreshApp() {
    if (user) {
      await refreshData();
    } else {
      await bootstrap();
    }
  }

  function navigate(view: ViewKey) {
    if (user && !canAccess(view, user.role)) {
      setActiveView("dashboard");
      return;
    }
    setActiveView(view);
  }

  function exportCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
    try {
      exportCsvFile(filename, rows);
      setMessage(`Unduh ${filename} berhasil dibuat`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function addToCart(product: ProductRow) {
    setActiveView("pos");
    addProductToCart(product);
  }

  function clearCart() {
    clearPosCart();
  }

  function holdCart() {
    holdPosCart();
  }

  async function submitCheckout(cashReceived?: number) {
    await submitPosCheckout({ saving, setSaving, cashReceived });
  }

  const handleTransactionAction = useCallback(async (id: number, action: "void" | "reverse" | "complete", reason: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await transactionAction({ id, action, reason });
      await refreshData();
      setMessage(`Transaksi berhasil di-${action === "void" ? "batalkan" : action === "reverse" ? "reverse" : "selesaikan"}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }, [saving, setSaving, refreshData, setMessage]);

  if (setupNeeded) {
    return (
      <AuthShell
        kind="setup"
        saving={saving}
        message={message}
        showPassword={showAuthPassword}
        onTogglePassword={() => setShowAuthPassword(!showAuthPassword)}
        setupForm={setupForm}
        loginForm={loginForm}
        onSetupFormChange={setSetupForm}
        onLoginFormChange={setLoginForm}
        onSubmitSetup={submitSetup}
        onSubmitLogin={submitLogin}
      />
    );
  }
  if (!user) {
    return (
      <AuthShell
        kind="login"
        saving={saving}
        message={message}
        showPassword={showAuthPassword}
        onTogglePassword={() => setShowAuthPassword(!showAuthPassword)}
        setupForm={setupForm}
        loginForm={loginForm}
        onSetupFormChange={setSetupForm}
        onLoginFormChange={setLoginForm}
        onSubmitSetup={submitSetup}
        onSubmitLogin={submitLogin}
      />
    );
  }

  // Access denied banner
  if (!canAccess(activeView, user.role)) {
    return (
      <AppShell
        user={user}
        activeView={activeView}
        message={message}
        loading={loading}
        onNavigate={navigate}
        onRefresh={refreshApp}
        onLogout={logout}
      >
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-amber-900">Akses Admin Diperlukan</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-800">
            Menu ini hanya untuk owner/admin. Akun kasir tetap bisa memakai Dashboard, Kasir POS, Layanan Agen, dan Riwayat Transaksi.
          </p>
          <button
            type="button"
            onClick={() => setActiveView("dashboard")}
            className="mt-4 rounded-2xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700"
          >
            Kembali ke Dashboard
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      user={user}
      activeView={activeView}
      message={message}
      loading={loading}
      onNavigate={navigate}
      onRefresh={refreshApp}
      onLogout={logout}
    >
      <ErrorBoundary onReset={refreshApp}>
        <AppRouter
          activeView={activeView}
          user={user}
          saving={saving}
          accounts={accounts}
          accountMutations={accountMutations}
          categories={categories}
          products={products}
          filteredProducts={filteredProducts}
          filteredTransactions={filteredTransactions}
          debts={debts}
          users={users}
          backups={backups}
          appLogs={appLogs}
          transactions={transactions}
          totalCash={totalCash}
          lowStockCount={lowStockCount}
          loading={loading}
          dbPath={dbPath}
          cart={cart}
          cartTotal={cartTotal}
          paymentMethod={paymentMethod}
          settlementAccountId={settlementAccountId}
          settlementAccounts={settlementAccounts}
          posCategoryFilter={posCategoryFilter}
          onCategoryFilterChange={setPosCategoryFilter}
          onAddToCart={addToCart}
          onAddAgentService={posCart.addAgentService}
          onUpdateQty={updateCartQty}
          onRemoveCartItem={removeCartItem}
          onPaymentMethodChange={setPaymentMethod}
          onSettlementAccountChange={setSettlementAccountId}
          onHoldCart={holdCart}
          onClearCart={clearCart}
          onSubmitCheckout={submitCheckout}
          agentForm={agentForm}
          agentStep={agentStep}
          onAgentFormChange={setAgentForm}
          onAgentStepChange={setAgentStep}
          onApplyPreset={applyAgentPreset}
          onSubmitAgentTransaction={submitAgentTransaction}
          selectedTransaction={selectedTransaction}
          selectedTransactionItems={selectedTransactionItems}
          onOpenDetail={openTransactionDetail}
          onTransactionAction={handleTransactionAction}
          userForm={userForm}
          onUserFormChange={setUserForm}
          onSubmitUser={submitUser}
          onExportCsv={exportCsv}
          onAddAccount={openAddAccount}
          onTransfer={openTransfer}
          onAdjust={openAdjust}
          onOwnerDraw={openOwnerDraw}
          onBankFee={openBankFee}
          onCreateBackup={handleCreateBackup}
          onRestoreBackup={handleRestoreBackup}
          onRefreshLogs={refreshApp}
          onMessage={setMessage}
          onRefreshApp={refreshApp}
          onAddCategory={() => setShowCategoryModal(true)}
          onAddProduct={openAddProduct}
          onEditProduct={startEditProduct}
          onRemoveProduct={removeProduct}
          debtForm={debtForm}
          debtPaymentForm={debtPaymentForm}
          onDebtFormChange={setDebtForm}
          onDebtPaymentFormChange={setDebtPaymentForm}
          onSubmitDebt={submitDebt}
          onSubmitDebtPayment={submitDebtPayment}
          onCopyDebtReminder={copyDebtReminder}
        />
      </ErrorBoundary>
      <CashDialogs
        cashModal={cashModal}
        accounts={accounts}
        saving={saving}
        accountForm={accountForm}
        adjustForm={adjustForm}
        transferForm={transferForm}
        ownerDrawForm={ownerDrawForm}
        bankFeeForm={bankFeeForm}
        onClose={() => setCashModal(null)}
        onAccountFormChange={setAccountForm}
        onAdjustFormChange={setAdjustForm}
        onTransferFormChange={setTransferForm}
        onOwnerDrawFormChange={setOwnerDrawForm}
        onBankFeeFormChange={setBankFeeForm}
        onSubmitAccount={submitAccount}
        onSubmitAdjustment={submitAdjustment}
        onSubmitTransfer={submitTransfer}
        onSubmitOwnerDraw={submitOwnerDraw}
        onSubmitBankFee={submitBankFee}
      />
      <ProductDialogs
        showCategoryModal={showCategoryModal}
        showProductModal={showProductModal}
        saving={saving}
        editingProductId={editingProductId}
        categoryForm={categoryForm}
        productForm={productForm}
        categories={categories}
        onCloseCategory={() => setShowCategoryModal(false)}
        onCloseProduct={() => { setShowProductModal(false); clearProductForm(); }}
        onCategoryFormChange={setCategoryForm}
        onProductFormChange={setProductForm}
        onSubmitCategory={submitCategory}
        onSubmitProduct={submitProduct}
      />
      <ReceiptModal receipt={lastReceipt} onClose={() => setLastReceipt(null)} />
    </AppShell>
  );
}