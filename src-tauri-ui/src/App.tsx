import { useEffect, useState } from "react";
import {
  createAdmin,
  createUser,
  listTransactionItems,
  login,
} from "./api";
import type { AccountRow, ProductRow, PublicUser, TransactionItemRow, TransactionRow } from "./api";
import { ProductDialogs } from "./components/ProductDialogs";
import { ReceiptModal } from "./components/ReceiptModal";
import { DashboardPage } from "./pages/DashboardPage";
import { DebtsPage } from "./pages/DebtsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LogsPage } from "./pages/LogsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatementPage } from "./pages/StatementPage";
import { AgentServicesPage } from "./pages/AgentServicesPage";
import { POSPage } from "./pages/POSPage";
import { ProductMasterPage } from "./pages/ProductMasterPage";
import { useAppData } from "./hooks/useAppData";
import { usePosCart } from "./hooks/usePosCart";
import { useProductMaster } from "./hooks/useProductMaster";
import { useDebtBook } from "./hooks/useDebtBook";
import { useCashActions } from "./hooks/useCashActions";
import { useAgentTransaction } from "./hooks/useAgentTransaction";
import { useBackupRestore } from "./hooks/useBackupRestore";
import { AuthShell } from "./components/AuthShell";
import { CashDialogs, type CashModalType } from "./components/CashDialogs";
import { CashBalancePage } from "./pages/CashBalancePage";
import { CurrencyInput } from "./components/CurrencyInput";
import { Icon } from "./components/AppIcon";
import { formatRupiah } from "./lib/format";
import { exportCsvFile } from "./lib/csv";
import type { IconName, ViewKey } from "./types";


const navItems: Array<{ id: ViewKey; label: string; icon: IconName; adminOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "pos", label: "Kasir POS", icon: "pos" },
  { id: "brilink", label: "Layanan Agen", icon: "brilink" },
  { id: "products", label: "Produk", icon: "products", adminOnly: true },
  { id: "history", label: "Transaksi", icon: "history" },
  { id: "debts", label: "Buku Utang", icon: "debts" },
  { id: "rekeningKoran", label: "Rekening Koran", icon: "rekeningKoran", adminOnly: true },
  { id: "cash", label: "Kas & Saldo", icon: "cash", adminOnly: true },
  { id: "reports", label: "Laporan", icon: "reports", adminOnly: true },
  { id: "logs", label: "Log Aktivitas", icon: "logs", adminOnly: true },
  { id: "settings", label: "Pengaturan", icon: "settings", adminOnly: true },
];

export default function App() {
  const [saving, setSaving] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
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
  const [user, setUser] = useState<PublicUser | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [posStep, setPosStep] = useState<1 | 2 | 3>(1);
  const [posCategoryFilter, setPosCategoryFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<TransactionItemRow[]>([]);
  const [form, setForm] = useState({ name: "Admin", username: "admin", password: "Admin123" });
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "Admin123" });
  const [userForm, setUserForm] = useState({ name: "Kasir", username: "kasir", password: "Kasir123", role: "kasir" as "admin" | "kasir" });
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
    clearCart: clearPosCart,
    holdCart: holdPosCart,
    submitCheckout: submitPosCheckout,
  } = posCart;

  const productMaster = useProductMaster({
    saving,
    setSaving,
    onRefresh: refreshData,
    onMessage: setMessage,
    onNavigateProducts: () => setActiveView("products"),
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

  const settlementAccounts = accounts.filter((account) => account.code !== "cash");
  const totalCash = accounts.reduce((sum, account) => sum + account.balance, 0);
  const todayTransactions = transactions.length;
  const lowStockCount = products.filter((product) => product.stock <= product.min_stock).length;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchedProducts = normalizedSearch
    ? products.filter((product) => [product.name, product.barcode || "", product.category_name || ""].join(" ").toLowerCase().includes(normalizedSearch))
    : products;
  const filteredProducts = posCategoryFilter === "all"
    ? searchedProducts
    : searchedProducts.filter((product) => String(product.category_id || "") === posCategoryFilter);
  const filteredTransactions = normalizedSearch
    ? transactions.filter((transaction) => [transaction.invoice_no, transaction.customer_name || "", transaction.notes || "", transaction.payment_method].join(" ").toLowerCase().includes(normalizedSearch))
    : transactions;
  const filteredDebts = normalizedSearch
    ? debts.filter((debt) => [debt.customer_name, debt.phone || "", debt.notes || ""].join(" ").toLowerCase().includes(normalizedSearch))
    : debts;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    bootstrap();
    // POC bootstrap cukup dijalankan sekali saat window Tauri dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settlementAccountId) {
      const firstBank = accounts.find((account) => account.code !== "cash");
      if (firstBank) setSettlementAccountId(String(firstBank.id));
    }
  }, [accounts, settlementAccountId, setSettlementAccountId]);


  function exportCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
    try {
      exportCsvFile(filename, rows);
      setMessage(`Export ${filename} berhasil dibuat`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }


  async function submitUser(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createUser(userForm);
      setUserForm({ name: "Kasir", username: "kasir", password: "Kasir123", role: "kasir" });
      await refreshData();
      setMessage("User berhasil dibuat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitSetup(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const admin = await createAdmin(form);
      setUser(admin);
      setSetupNeeded(false);
      await refreshData();
      setMessage("Setup admin berhasil");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await login(loginForm);
      setUser(result.user);
      setActiveView("dashboard");
      await refreshData();
      setMessage(`Selamat datang, ${result.user.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  function addToCart(product: ProductRow) {
    setActiveView("pos");
    setPosStep(2);
    addProductToCart(product);
  }

  function clearCart() {
    clearPosCart();
    setPosStep(1);
  }

  function holdCart() {
    holdPosCart();
    setPosStep(1);
  }

  async function submitCheckout() {
    await submitPosCheckout({ saving, setSaving, resetStep: () => setPosStep(1) });
  }


  async function openTransactionDetail(transaction: TransactionRow) {
    setSelectedTransaction(transaction);
    try {
      setSelectedTransactionItems(await listTransactionItems({ transaction_id: transaction.id }));
    } catch (error) {
      setSelectedTransactionItems([]);
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function renderActiveView() {
    if (activeView === "pos") return <POSPage categories={categories} products={filteredProducts} cart={cart} cartTotal={cartTotal} paymentMethod={paymentMethod} settlementAccountId={settlementAccountId} settlementAccounts={settlementAccounts} saving={saving} posCategoryFilter={posCategoryFilter} onCategoryFilterChange={setPosCategoryFilter} onAddToCart={addToCart} onUpdateQty={updateCartQty} onPaymentMethodChange={setPaymentMethod} onSettlementAccountChange={setSettlementAccountId} onHoldCart={holdCart} onClearCart={clearCart} onSubmitCheckout={submitCheckout} />;
    if (activeView === "brilink") return <AgentServicesPage accounts={accounts} transactions={transactions} agentForm={agentForm} agentStep={agentStep} saving={saving} onAgentFormChange={setAgentForm} onAgentStepChange={setAgentStep} onApplyPreset={applyAgentPreset} onSubmitAgentTransaction={submitAgentTransaction} />;
    if (activeView === "products") return <ProductMasterPage categories={categories} products={filteredProducts} onAddCategory={() => setShowCategoryModal(true)} onAddProduct={openAddProduct} onEditProduct={startEditProduct} onRemoveProduct={removeProduct} />;
    if (activeView === "history") return <HistoryPage transactions={filteredTransactions} selectedTransaction={selectedTransaction} selectedTransactionItems={selectedTransactionItems} onOpenDetail={openTransactionDetail} />;
    if (activeView === "debts") return <DebtsPage debts={filteredDebts} debtForm={debtForm} debtPaymentForm={debtPaymentForm} saving={saving} onDebtFormChange={setDebtForm} onDebtPaymentFormChange={setDebtPaymentForm} onSubmitDebt={submitDebt} onSubmitDebtPayment={submitDebtPayment} onCopyReminder={copyDebtReminder} />;
    if (activeView === "rekeningKoran") return <StatementPage accounts={accounts} mutations={accountMutations} onExportCsv={() => exportCsv("rekening-koran-catatagen.csv", accountMutations.map((m) => ({ akun: m.account_name, tipe: m.mutation_type, nominal: m.amount, saldo_akhir: m.balance_after, catatan: m.notes, tanggal: m.created_at })))} />;
    if (activeView === "cash") return <CashBalancePage accounts={accounts} mutations={accountMutations} onAddAccount={openAddAccount} onTransfer={openTransfer} onAdjust={openAdjust} onOwnerDraw={openOwnerDraw} onBankFee={openBankFee} />;
    if (activeView === "reports") return <ReportsPage transactions={transactions} mutations={accountMutations} onExportCsv={({ posRevenue, posProfit, agentProfit }) => exportCsv("laporan-catatagen.csv", [{ omzet_pos: posRevenue, profit_pos: posProfit, fee_agen: agentProfit, total_mutasi: accountMutations.length }])} />;
    if (activeView === "logs") return <LogsPage logs={normalizedSearch ? appLogs.filter((log) => [log.level, log.source, log.message, log.created_at].join(" ").toLowerCase().includes(normalizedSearch)) : appLogs} onRefresh={bootstrap} />;
    if (activeView === "settings") return <SettingsPage users={users} userForm={userForm} saving={saving} transactions={transactions} mutations={accountMutations} debts={debts} products={products} backups={backups} dbPath={dbPath} onUserFormChange={setUserForm} onSubmitUser={submitUser} onExportCsv={exportCsv} onCreateBackup={handleCreateBackup} onRestoreBackup={handleRestoreBackup} />;
    return <DashboardPage accounts={accounts} products={products} transactions={filteredTransactions} totalCash={totalCash} lowStockCount={lowStockCount} cartTotal={cartTotal} cartCount={cart.length} loading={loading} onNavigate={setActiveView} onRefresh={bootstrap} />;
  }

  if (setupNeeded) {
    return (
      <AuthShell
        kind="setup"
        saving={saving}
        message={message}
        showPassword={showAuthPassword}
        onTogglePassword={() => setShowAuthPassword(!showAuthPassword)}
        setupForm={form}
        loginForm={loginForm}
        onSetupFormChange={setForm}
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
        setupForm={form}
        loginForm={loginForm}
        onSetupFormChange={setForm}
        onLoginFormChange={setLoginForm}
        onSubmitSetup={submitSetup}
        onSubmitLogin={submitLogin}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-row"><div className="brand-mark small">CA</div><div><strong>CatatAgen</strong><small>Local Edition</small></div></div>
        <nav>
          {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button key={item.id} className={activeView === item.id ? "nav-item active" : "nav-item"} onClick={() => setActiveView(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>Login sebagai</small>
          <strong>{user.name}</strong>
          <span>{user.role}</span>
          <button className="secondary logout-button" onClick={() => { setUser(null); setActiveView("dashboard"); }}>Keluar</button>
        </div>
      </aside>
      <section className="content-shell">
        <header className="topbar">
          <label className="search-box"><Icon name="search" /> <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari produk, transaksi, pelanggan..." /></label>
          <div className="topbar-actions"><span className="status-pill">{message || "Siap"}</span><button onClick={bootstrap} disabled={loading}>Refresh</button></div>
        </header>
        <main className="page-content">{renderActiveView()}</main>
      </section>
      <CashDialogs cashModal={cashModal} accounts={accounts} saving={saving} accountForm={accountForm} adjustForm={adjustForm} transferForm={transferForm} ownerDrawForm={ownerDrawForm} bankFeeForm={bankFeeForm} onClose={() => setCashModal(null)} onAccountFormChange={setAccountForm} onAdjustFormChange={setAdjustForm} onTransferFormChange={setTransferForm} onOwnerDrawFormChange={setOwnerDrawForm} onBankFeeFormChange={setBankFeeForm} onSubmitAccount={submitAccount} onSubmitAdjustment={submitAdjustment} onSubmitTransfer={submitTransfer} onSubmitOwnerDraw={submitOwnerDraw} onSubmitBankFee={submitBankFee} />
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
    </div>
  );
}
