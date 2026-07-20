import { useEffect, useState } from "react";
import {
  adjustAccountBalance,
  bankFee,
  createAccount,
  createAdmin,
  createDatabaseBackup,
  createAgentTransaction,
  createUser,
  listTransactionItems,
  login,
  ownerDraw,
  restoreDatabaseBackup,
  transferAccounts,
} from "./api";
import type { AccountRow, BackupRow, ProductRow, PublicUser, TransactionItemRow, TransactionRow } from "./api";
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
import { AuthShell } from "./components/AuthShell";
import { CashDialogs, type CashModalType } from "./components/CashDialogs";
import { CashBalancePage } from "./pages/CashBalancePage";
import { CurrencyInput } from "./components/CurrencyInput";
import { Icon } from "./components/AppIcon";
import { formatRupiah } from "./lib/format";
import type { AgentForm, IconName, ViewKey } from "./types";


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
  const [agentStep, setAgentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<TransactionItemRow[]>([]);
  const [cashModal, setCashModal] = useState<CashModalType>(null);
  const [form, setForm] = useState({ name: "Admin", username: "admin", password: "Admin123" });
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "Admin123" });
  const [userForm, setUserForm] = useState({ name: "Kasir", username: "kasir", password: "Kasir123", role: "kasir" as "admin" | "kasir" });
  const [accountForm, setAccountForm] = useState({ code: "bri", name: "Rekening BRI", initial_balance: "0", min_balance: "0" });
  const [adjustForm, setAdjustForm] = useState({ account_id: "", amount: "0", notes: "Penyesuaian saldo" });
  const [transferForm, setTransferForm] = useState({ from_account_id: "", to_account_id: "", amount: "0", notes: "Transfer antar rekening" });
  const [ownerDrawForm, setOwnerDrawForm] = useState({ account_id: "", amount: "0", notes: "Prive Owner" });
  const [bankFeeForm, setBankFeeForm] = useState({ account_id: "", amount: "0", notes: "Biaya Bank / MDR" });
  const [agentForm, setAgentForm] = useState<AgentForm>({ service_name: "Tarik Tunai", customer_name: "", amount: "0", fee: "5000", provider_cost: "0", account_id: "", cash_effect: "0", bank_effect: "0", notes: "" });
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
    if (rows.length === 0) {
      setMessage("Tidak ada data untuk diexport");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`Export ${filename} berhasil dibuat`);
  }


  async function handleCreateBackup() {
    setSaving(true);
    try {
      const backup = await createDatabaseBackup();
      await refreshData();
      setMessage(`Backup berhasil dibuat: ${backup.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreBackup(backup: BackupRow) {
    if (!confirm(`Restore database dari ${backup.name}? Data saat ini akan dibackup otomatis sebelum restore.`)) return;
    setSaving(true);
    try {
      await restoreDatabaseBackup({ path: backup.path });
      await refreshData();
      setMessage("Restore database berhasil. Jika ada data yang belum berubah, tutup dan buka ulang aplikasi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
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

  async function submitAccount(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createAccount({
        code: accountForm.code,
        name: accountForm.name,
        initial_balance: Number(accountForm.initial_balance || 0),
        min_balance: Number(accountForm.min_balance || 0),
      });
      setAccountForm({ code: "", name: "", initial_balance: "0", min_balance: "0" });
      setCashModal(null);
      await refreshData();
      setMessage("Rekening berhasil ditambahkan");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitAdjustment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await adjustAccountBalance({
        account_id: Number(adjustForm.account_id),
        amount: Number(adjustForm.amount || 0),
        notes: adjustForm.notes,
      });
      setAdjustForm({ ...adjustForm, amount: "0" });
      setCashModal(null);
      await refreshData();
      setMessage("Saldo berhasil disesuaikan");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }


  async function submitTransfer(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await transferAccounts({
        from_account_id: Number(transferForm.from_account_id),
        to_account_id: Number(transferForm.to_account_id),
        amount: Number(transferForm.amount || 0),
        notes: transferForm.notes,
      });
      setTransferForm({ ...transferForm, amount: "0" });
      setCashModal(null);
      await refreshData();
      setMessage("Transfer antar rekening berhasil");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitOwnerDraw(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await ownerDraw({ account_id: Number(ownerDrawForm.account_id), amount: Number(ownerDrawForm.amount || 0), notes: ownerDrawForm.notes });
      setOwnerDrawForm({ ...ownerDrawForm, amount: "0" });
      setCashModal(null);
      await refreshData();
      setMessage("Ambil profit owner berhasil dicatat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitBankFee(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await bankFee({ account_id: Number(bankFeeForm.account_id), amount: Number(bankFeeForm.amount || 0), notes: bankFeeForm.notes });
      setBankFeeForm({ ...bankFeeForm, amount: "0" });
      setCashModal(null);
      await refreshData();
      setMessage("Biaya bank/MDR berhasil dicatat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }


  function applyAgentPreset(kind: "withdraw" | "deposit" | "transfer" | "payment") {
    if (kind === "withdraw") setAgentForm({ ...agentForm, service_name: "Tarik Tunai", cash_effect: "0", bank_effect: "0", fee: "5000", provider_cost: "0" });
    if (kind === "deposit") setAgentForm({ ...agentForm, service_name: "Setor Tunai", cash_effect: "0", bank_effect: "0", fee: "5000", provider_cost: "0" });
    if (kind === "transfer") setAgentForm({ ...agentForm, service_name: "Transfer", cash_effect: "0", bank_effect: "0", fee: "5000", provider_cost: "0" });
    if (kind === "payment") setAgentForm({ ...agentForm, service_name: "Pembayaran / Topup", cash_effect: "0", bank_effect: "0", fee: "2500", provider_cost: "0" });
    setAgentStep(2);
  }

  async function submitAgentTransaction(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createAgentTransaction({
        service_name: agentForm.service_name,
        customer_name: agentForm.customer_name,
        amount: Number(agentForm.amount || 0),
        fee: Number(agentForm.fee || 0),
        provider_cost: Number(agentForm.provider_cost || 0),
        account_id: agentForm.account_id ? Number(agentForm.account_id) : null,
        cash_effect: Number(agentForm.cash_effect || 0),
        bank_effect: Number(agentForm.bank_effect || 0),
        notes: agentForm.notes,
      });
      setAgentStep(1);
      await refreshData();
      setMessage("Transaksi layanan agen berhasil dicatat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
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
    if (activeView === "cash") return <CashBalancePage accounts={accounts} mutations={accountMutations} onAddAccount={() => setCashModal("account")} onTransfer={(account) => { if (account) setTransferForm({ ...transferForm, from_account_id: String(account.id) }); setCashModal("transfer"); }} onAdjust={(account) => { setAdjustForm({ ...adjustForm, account_id: String(account.id) }); setCashModal("adjust"); }} onOwnerDraw={(account) => { setOwnerDrawForm({ ...ownerDrawForm, account_id: String(account.id) }); setCashModal("ownerDraw"); }} onBankFee={(account) => { setBankFeeForm({ ...bankFeeForm, account_id: String(account.id) }); setCashModal("bankFee"); }} />;
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
