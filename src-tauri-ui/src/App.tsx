import { useEffect, useMemo, useState } from "react";
import {
  AccountMutationRow,
  AccountRow,
  AppLogRow,
  BackupRow,
  CategoryRow,
  DebtRow,
  ProductRow,
  PublicUser,
  TransactionItemRow,
  TransactionRow,
  addDebtPayment,
  adjustAccountBalance,
  bankFee,
  buildDebtReminder,
  checkoutPosCash,
  createAccount,
  createAdmin,
  createDatabaseBackup,
  createAgentTransaction,
  createDebt,
  createCategory,
  createProduct,
  createUser,
  deactivateProduct,
  dbInit,
  healthCheck,
  listAccountMutations,
  listAccounts,
  listAppLogs,
  listCategories,
  listDatabaseBackups,
  listDebts,
  listProducts,
  listTransactionItems,
  listTransactions,
  listUsers,
  login,
  ownerDraw,
  restoreDatabaseBackup,
  setupStatus,
  transferAccounts,
  updateProduct,
} from "./api";
import { ProductDialogs } from "./components/ProductDialogs";
import { ReceiptModal } from "./components/ReceiptModal";
import { AgentServicesPage } from "./pages/AgentServicesPage";
import { POSPage } from "./pages/POSPage";
import { ProductMasterPage } from "./pages/ProductMasterPage";
import { AuthShell } from "./components/AuthShell";
import { CashDialogs, type CashModalType } from "./components/CashDialogs";
import { CashBalancePage } from "./pages/CashBalancePage";
import { CurrencyInput } from "./components/CurrencyInput";
import { Icon } from "./components/AppIcon";
import { formatRupiah, mutationLabel, paymentLabel } from "./lib/format";
import type { AgentForm, CartItem, IconName, ReceiptState, ViewKey } from "./types";


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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [posStep, setPosStep] = useState<1 | 2 | 3>(1);
  const [posCategoryFilter, setPosCategoryFilter] = useState("all");
  const [agentStep, setAgentStep] = useState<1 | 2 | 3 | 4>(1);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountMutations, setAccountMutations] = useState<AccountMutationRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [appLogs, setAppLogs] = useState<AppLogRow[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<TransactionItemRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastReceipt, setLastReceipt] = useState<ReceiptState | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [cashModal, setCashModal] = useState<CashModalType>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "Admin", username: "admin", password: "Admin123" });
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "Admin123" });
  const [userForm, setUserForm] = useState({ name: "Kasir", username: "kasir", password: "Kasir123", role: "kasir" as "admin" | "kasir" });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris">("cash");
  const [settlementAccountId, setSettlementAccountId] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "package", color: "#059669" });
  const [accountForm, setAccountForm] = useState({ code: "bri", name: "Rekening BRI", initial_balance: "0", min_balance: "0" });
  const [adjustForm, setAdjustForm] = useState({ account_id: "", amount: "0", notes: "Penyesuaian saldo" });
  const [transferForm, setTransferForm] = useState({ from_account_id: "", to_account_id: "", amount: "0", notes: "Transfer antar rekening" });
  const [ownerDrawForm, setOwnerDrawForm] = useState({ account_id: "", amount: "0", notes: "Prive Owner" });
  const [bankFeeForm, setBankFeeForm] = useState({ account_id: "", amount: "0", notes: "Biaya Bank / MDR" });
  const [agentForm, setAgentForm] = useState<AgentForm>({ service_name: "Tarik Tunai", customer_name: "", amount: "0", fee: "5000", provider_cost: "0", account_id: "", cash_effect: "0", bank_effect: "0", notes: "" });
  const [debtForm, setDebtForm] = useState({ customer_name: "", phone: "", amount: "0", notes: "" });
  const [debtPaymentForm, setDebtPaymentForm] = useState({ debt_id: "", amount: "0", notes: "Cicilan utang" });
  const [productForm, setProductForm] = useState({
    name: "",
    barcode: "",
    category_id: "",
    buy_price: "0",
    sell_price: "0",
    stock: "0",
    min_stock: "5",
    unit: "pcs",
  });

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sell_price * item.quantity, 0),
    [cart],
  );
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

  async function refreshData() {
    const [nextAccounts, nextMutations, nextCategories, nextProducts, nextTransactions, nextDebts, nextUsers, nextBackups, nextLogs] = await Promise.all([
      listAccounts(),
      listAccountMutations(),
      listCategories(),
      listProducts(),
      listTransactions(),
      listDebts(),
      listUsers(),
      listDatabaseBackups(),
      listAppLogs(),
    ]);
    setAccounts(nextAccounts);
    setAccountMutations(nextMutations);
    setCategories(nextCategories);
    setProducts(nextProducts);
    setTransactions(nextTransactions);
    setDebts(nextDebts);
    setUsers(nextUsers);
    setBackups(nextBackups);
    setAppLogs(nextLogs);
    if (!settlementAccountId) {
      const firstBank = nextAccounts.find((account) => account.code !== "cash");
      if (firstBank) setSettlementAccountId(String(firstBank.id));
    }
  }

  async function bootstrap() {
    setLoading(true);
    try {
      const health = await healthCheck();
      const db = await dbInit();
      const setup = await setupStatus();
      setDbPath(db.path);
      setSetupNeeded(setup.setup_needed);
      setMessage(`${health.app} siap (${health.backend})`);
      if (!setup.setup_needed) await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
    // POC bootstrap cukup dijalankan sekali saat window Tauri dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  async function submitCategory(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createCategory(categoryForm);
      setCategoryForm({ name: "", icon: "package", color: "#059669" });
      setShowCategoryModal(false);
      await refreshData();
      setMessage("Kategori berhasil ditambahkan");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitProduct(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: productForm.name,
        barcode: productForm.barcode,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        buy_price: Number(productForm.buy_price || 0),
        sell_price: Number(productForm.sell_price || 0),
        stock: Number(productForm.stock || 0),
        min_stock: Number(productForm.min_stock || 0),
        unit: productForm.unit || "pcs",
      };
      if (editingProductId) {
        await updateProduct({ ...payload, id: editingProductId });
      } else {
        await createProduct(payload);
      }
      clearProductForm();
      setShowProductModal(false);
      await refreshData();
      setMessage(editingProductId ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  function clearProductForm() {
    setEditingProductId(null);
    setProductForm({ name: "", barcode: "", category_id: "", buy_price: "0", sell_price: "0", stock: "0", min_stock: "5", unit: "pcs" });
  }

  function startEditProduct(product: ProductRow) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      barcode: product.barcode || "",
      category_id: product.category_id ? String(product.category_id) : "",
      buy_price: String(product.buy_price),
      sell_price: String(product.sell_price),
      stock: String(product.stock),
      min_stock: String(product.min_stock),
      unit: product.unit || "pcs",
    });
    setActiveView("products");
    setShowProductModal(true);
  }

  async function removeProduct(product: ProductRow) {
    if (!confirm(`Nonaktifkan produk ${product.name}?`)) return;
    setSaving(true);
    try {
      await deactivateProduct({ id: product.id });
      await refreshData();
      setMessage("Produk berhasil dinonaktifkan");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  function addToCart(product: ProductRow) {
    if (product.stock <= 0) {
      setMessage(`Stok ${product.name} habis`);
      return;
    }
    setActiveView("pos");
    setPosStep(2);
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  function updateCartQty(productId: number, quantity: number) {
    setCart((items) => items.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      if (quantity <= 0) return [];
      return [{ ...item, quantity: Math.min(quantity, item.product.stock) }];
    }));
  }


  function clearCart() {
    setCart([]);
    setPosStep(1);
    setMessage("Keranjang dikosongkan");
  }

  function holdCart() {
    if (cart.length === 0) return;
    setCart([]);
    setPosStep(1);
    setMessage("Keranjang ditahan. Fitur daftar hold akan dilengkapi berikutnya.");
  }

  async function submitCheckout() {
    setSaving(true);
    const receiptItems = cart.map((item) => ({ ...item }));
    const receiptPayment = paymentMethod;
    try {
      const result = await checkoutPosCash({
        payment_method: paymentMethod,
        settlement_account_id: paymentMethod === "cash" ? null : Number(settlementAccountId),
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      setLastReceipt({
        invoice_no: result.invoice_no,
        payment_method: receiptPayment,
        total_amount: result.total_amount,
        created_at: new Date().toLocaleString("id-ID"),
        items: receiptItems,
      });
      setCart([]);
      setPosStep(1);
      await refreshData();
      setMessage(`Checkout berhasil: ${result.invoice_no} • ${formatRupiah(result.total_amount)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
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


  async function submitDebt(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createDebt({ customer_name: debtForm.customer_name, phone: debtForm.phone, amount: Number(debtForm.amount || 0), notes: debtForm.notes });
      setDebtForm({ customer_name: "", phone: "", amount: "0", notes: "" });
      await refreshData();
      setMessage("Utang pelanggan berhasil dicatat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setSaving(false); }
  }

  async function submitDebtPayment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await addDebtPayment({ debt_id: Number(debtPaymentForm.debt_id), amount: Number(debtPaymentForm.amount || 0), notes: debtPaymentForm.notes });
      setDebtPaymentForm({ ...debtPaymentForm, amount: "0" });
      await refreshData();
      setMessage("Pembayaran utang berhasil dicatat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setSaving(false); }
  }

  async function copyDebtReminder(debt: DebtRow) {
    try {
      const text = await buildDebtReminder({ debt_id: debt.id });
      await navigator.clipboard.writeText(text);
      setMessage("Pesan pengingat utang disalin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
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

  function renderDashboard() {
    return (
      <>
        <div className="hero-panel">
          <div>
            <p className="eyebrow">CatatAgen Local</p>
            <h1>Dashboard Operasional</h1>
            <p>POS retail, layanan agen non-API, saldo virtual, dan buku utang dalam satu aplikasi ringan.</p>
          </div>
          <div className="hero-actions">
            <button onClick={() => setActiveView("pos")}>Buka Kasir</button>
            <button className="secondary" onClick={bootstrap} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
          </div>
        </div>
        <section className="stat-grid">
          <div className="stat-card green"><span>Saldo Kas</span><strong>{formatRupiah(totalCash)}</strong><small>Total saldo akun aktif</small></div>
          <div className="stat-card blue"><span>Produk</span><strong>{products.length}</strong><small>{lowStockCount} stok menipis</small></div>
          <div className="stat-card amber"><span>Transaksi</span><strong>{todayTransactions}</strong><small>Riwayat POC tersimpan</small></div>
          <div className="stat-card purple"><span>Keranjang</span><strong>{formatRupiah(cartTotal)}</strong><small>{cart.length} item siap checkout</small></div>
        </section>
        <section className="quick-launch-grid">
          <button onClick={() => setActiveView("pos")} className="launch-card"><Icon name="pos" /><strong>Kasir POS</strong><span>Jual barang fisik</span></button>
          <button onClick={() => setActiveView("brilink")} className="launch-card"><Icon name="brilink" /><strong>Layanan Agen</strong><span>Catat transaksi non-API</span></button>
          <button onClick={() => setActiveView("debts")} className="launch-card"><Icon name="debts" /><strong>Buku Utang</strong><span>Piutang & reminder</span></button>
          <button onClick={() => setActiveView("cash")} className="launch-card"><Icon name="cash" /><strong>Kas & Saldo</strong><span>Saldo virtual</span></button>
        </section>
        <section className="grid dashboard-grid">
          <div className="card">
            <div className="card-header"><div><h2>Transaksi Terakhir</h2><p>Aktivitas POS dan layanan agen terbaru.</p></div></div>
            {filteredTransactions.length === 0 ? <div className="empty-state"><strong>Belum ada transaksi</strong><span>Mulai dari Kasir POS atau Layanan Agen.</span></div> : filteredTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="row rich-row">
                <div><strong>{transaction.invoice_no}</strong><small>{paymentLabel(transaction.payment_method)} • {transaction.status}</small></div>
                <strong>{formatRupiah(transaction.total_amount)}</strong>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div><h2>Perlu Perhatian</h2><p>Stok menipis dan posisi saldo.</p></div></div>
            {products.filter((product) => product.stock <= product.min_stock).slice(0, 4).map((product) => (
              <div key={product.id} className="row rich-row warning-row"><div><strong>{product.name}</strong><small>Stok {product.stock} / min {product.min_stock}</small></div><span className="status-badge warning">Stok rendah</span></div>
            ))}
            {lowStockCount === 0 && <div className="empty-state compact"><strong>Stok aman</strong><span>Tidak ada produk di bawah minimum.</span></div>}
            <div className="divider" />
            {accounts.slice(0, 3).map((account) => (
              <div key={account.id} className="row rich-row">
                <div><strong>{account.name}</strong><small>{account.code}</small></div>
                <strong>{formatRupiah(account.balance)}</strong>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderHistory() {
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Audit</p><h1>Riwayat Transaksi</h1></div></div>
        <div className="page-help"><strong>Cara pakai:</strong><span>Klik transaksi di kiri untuk melihat detail item di kanan.</span></div>
        <section className="grid workspace-grid">
          <div className="card history-card">
            <h2>Daftar Transaksi</h2>
            {transactions.length === 0 ? <p>Belum ada transaksi.</p> : (
              <div className="history-list">
                {filteredTransactions.map((transaction) => (
                  <button key={transaction.id} className="history-row clickable-row" onClick={() => openTransactionDetail(transaction)}>
                    <div><strong>{transaction.invoice_no}</strong><small>{transaction.transaction_type.toUpperCase()} • {paymentLabel(transaction.payment_method)} • {transaction.status}</small></div>
                    <div className="right history-amount"><span>{transaction.created_at}</span><strong>{formatRupiah(transaction.total_amount)}</strong></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h2>Detail Transaksi</h2>
            {!selectedTransaction ? <p>Pilih transaksi untuk melihat detail.</p> : (
              <div className="detail-panel">
                <div className="db-box"><strong>{selectedTransaction.invoice_no}</strong><span>{selectedTransaction.created_at}</span></div>
                <div className="row"><span>Metode</span><strong>{selectedTransaction.payment_method.toUpperCase()}</strong></div>
                <div className="row"><span>Status</span><strong>{selectedTransaction.status}</strong></div>
                <div className="row"><span>Total</span><strong>{formatRupiah(selectedTransaction.total_amount)}</strong></div>
                <h2>Item</h2>
                {selectedTransactionItems.length === 0 ? <p>Belum ada item detail.</p> : selectedTransactionItems.map((item) => (
                  <div key={item.id} className="row rich-row">
                    <div><strong>{item.product_name}</strong><small>{item.quantity} x {formatRupiah(item.unit_price)}</small></div>
                    <strong>{formatRupiah(item.subtotal)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  function renderDebts() {
    const visibleDebts = filteredDebts;
    const openDebts = visibleDebts.filter((debt) => debt.status !== "paid");
    const totalOutstanding = debts.filter((debt) => debt.status !== "paid").reduce((sum, debt) => sum + debt.outstanding, 0);
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Piutang</p><h1>Buku Utang</h1></div><div className="total-row mini-total"><span>Total Belum Lunas</span><strong>{formatRupiah(totalOutstanding)}</strong></div></div>
        <div className="page-help"><strong>Alur utang:</strong><span>Catat utang saat pelanggan belum bayar.</span><span>Catat cicilan saat pelanggan membayar.</span><span>Salin reminder untuk kirim via WhatsApp.</span></div>
        <section className="grid workspace-grid">
          <div className="card">
            <h2>Tambah Utang Pelanggan</h2>
            <form onSubmit={submitDebt} className="product-form">
              <label>Nama Pelanggan<input value={debtForm.customer_name} onChange={(e) => setDebtForm({ ...debtForm, customer_name: e.target.value })} /></label>
              <label>No WhatsApp<input value={debtForm.phone} onChange={(e) => setDebtForm({ ...debtForm, phone: e.target.value })} placeholder="628xxxx" /></label>
              <label>Nominal Utang<CurrencyInput value={debtForm.amount} onChange={(value) => setDebtForm({ ...debtForm, amount: value })} /></label>
              <label>Catatan<input value={debtForm.notes} onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving}>Simpan Utang</button>
            </form>
            <h2>Catat Cicilan / Pelunasan</h2>
            <form onSubmit={submitDebtPayment} className="product-form">
              <label>Pelanggan<select value={debtPaymentForm.debt_id} onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, debt_id: e.target.value })}>
                <option value="">Pilih utang</option>
                {openDebts.map((debt) => <option key={debt.id} value={debt.id}>{debt.customer_name} — {formatRupiah(debt.outstanding)}</option>)}
              </select></label>
              <label>Nominal Bayar<CurrencyInput value={debtPaymentForm.amount} onChange={(value) => setDebtPaymentForm({ ...debtPaymentForm, amount: value })} /></label>
              <label className="span-2">Catatan<input value={debtPaymentForm.notes} onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving || !debtPaymentForm.debt_id}>Simpan Pembayaran</button>
            </form>
          </div>
          <div className="card">
            <h2>Daftar Utang</h2>
            {visibleDebts.length === 0 ? <div className="empty-state"><strong>Belum ada data utang</strong><span>Catat utang pelanggan atau ubah pencarian.</span></div> : visibleDebts.map((debt) => (
              <div key={debt.id} className="debt-row">
                <div><strong>{debt.customer_name}</strong><small>{debt.phone || "Tanpa nomor"} • {debt.status === "paid" ? "Lunas" : "Belum lunas"}</small><small>{debt.notes || "-"}</small></div>
                <div className="amount-stack"><strong>{formatRupiah(debt.outstanding)}</strong><small>Total {formatRupiah(debt.amount)}</small><button className="secondary" onClick={() => copyDebtReminder(debt)} disabled={debt.status === "paid"}>Salin Reminder</button></div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderRekeningKoran() {
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Mutasi</p><h1>Rekening Koran</h1></div><button className="secondary" onClick={() => exportCsv("rekening-koran-catatagen.csv", accountMutations.map((m) => ({ akun: m.account_name, tipe: m.mutation_type, nominal: m.amount, saldo_akhir: m.balance_after, catatan: m.notes, tanggal: m.created_at })))}>Export CSV</button></div>
        <section className="grid dashboard-grid">
          <div className="card">
            <h2>Ringkasan Saldo</h2>
            {accounts.map((account) => (
              <div key={account.id} className="row rich-row"><div><strong>{account.name}</strong><small>{account.code}</small></div><strong>{formatRupiah(account.balance)}</strong></div>
            ))}
          </div>
          <div className="card">
            <h2>Mutasi Terakhir</h2>
            {accountMutations.length === 0 ? <p>Belum ada mutasi.</p> : accountMutations.map((mutation) => (
              <div key={mutation.id} className="row rich-row">
                <div><strong>{mutation.account_name}</strong><small>{mutationLabel(mutation.mutation_type)} • {mutation.created_at}</small></div>
                <div className="amount-stack"><strong className={mutation.amount < 0 ? "negative" : "positive"}>{formatRupiah(mutation.amount)}</strong><small>{mutation.notes || "-"}</small></div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderReports() {
    const posTransactions = transactions.filter((transaction) => transaction.transaction_type === "pos");
    const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
    const posRevenue = posTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0);
    const posProfit = posTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
    const agentProfit = agentTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Analitik</p><h1>Laporan</h1></div><button className="secondary" onClick={() => exportCsv("laporan-catatagen.csv", [{ omzet_pos: posRevenue, profit_pos: posProfit, fee_agen: agentProfit, total_mutasi: accountMutations.length }])}>Export CSV</button></div>
        <section className="stat-grid">
          <div className="stat-card green"><span>Omzet POS</span><strong>{formatRupiah(posRevenue)}</strong><small>{posTransactions.length} transaksi POS</small></div>
          <div className="stat-card blue"><span>Profit POS</span><strong>{formatRupiah(posProfit)}</strong><small>Dari margin produk</small></div>
          <div className="stat-card amber"><span>Fee Agen</span><strong>{formatRupiah(agentProfit)}</strong><small>{agentTransactions.length} transaksi agen</small></div>
          <div className="stat-card purple"><span>Total Mutasi</span><strong>{accountMutations.length}</strong><small>Mutasi saldo tersimpan</small></div>
        </section>
        <section className="card">
          <h2>Catatan Export</h2>
          <p>Export CSV/PDF native Tauri akan dibuat pada tahap berikutnya. Data laporan inti sudah tersedia di database lokal.</p>
        </section>
      </>
    );
  }


  function renderLogs() {
    const visibleLogs = normalizedSearch
      ? appLogs.filter((log) => [log.level, log.source, log.message, log.created_at].join(" ").toLowerCase().includes(normalizedSearch))
      : appLogs;
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Monitoring</p><h1>Log Aktivitas</h1></div><button className="secondary" onClick={bootstrap}>Refresh Log</button></div>
        <div className="page-help"><strong>Tujuan log:</strong><span>Melihat aktivitas penting seperti checkout, backup, restore, dan pembuatan user.</span></div>
        <section className="card">
          {visibleLogs.length === 0 ? <div className="empty-state"><strong>Belum ada log</strong><span>Log akan muncul setelah ada aktivitas penting.</span></div> : (
            <div className="log-list">
              {visibleLogs.map((log) => (
                <div key={log.id} className="log-row">
                  <span className={`log-level ${log.level.toLowerCase()}`}>{log.level}</span>
                  <div><strong>{log.message}</strong><small>{log.source} • {log.created_at}</small></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Sistem</p><h1>Pengaturan</h1></div></div>
        <section className="grid workspace-grid">
          <div className="card">
            <div className="card-header"><div><h2>Manajemen User</h2><p>Buat akun kasir agar staf tidak memakai akun owner.</p></div></div>
            <form onSubmit={submitUser} className="product-form">
              <label>Nama<input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></label>
              <label>Username<input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></label>
              <label>Password<input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></label>
              <label>Role<select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as "admin" | "kasir" })}>
                <option value="kasir">Kasir / Staff</option>
                <option value="admin">Owner / Admin</option>
              </select></label>
              <button type="submit" disabled={saving}>Buat User</button>
            </form>
            <div className="list">
              {users.map((item) => <div key={item.id} className="row rich-row"><div><strong>{item.name}</strong><small>{item.username}</small></div><span className="role-badge">{item.role}</span></div>)}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div><h2>Export Data</h2><p>Export CSV ringan untuk arsip manual.</p></div></div>
            <div className="quick-actions export-actions">
              <button className="secondary" onClick={() => exportCsv("transaksi-catatagen.csv", transactions.map((t) => ({ invoice: t.invoice_no, tipe: t.transaction_type, pelanggan: t.customer_name, total: t.total_amount, profit: t.profit, metode: t.payment_method, status: t.status, tanggal: t.created_at })))}>Export Transaksi</button>
              <button className="secondary" onClick={() => exportCsv("mutasi-saldo-catatagen.csv", accountMutations.map((m) => ({ akun: m.account_name, tipe: m.mutation_type, nominal: m.amount, saldo_akhir: m.balance_after, catatan: m.notes, tanggal: m.created_at })))}>Export Mutasi</button>
              <button className="secondary" onClick={() => exportCsv("utang-catatagen.csv", debts.map((d) => ({ pelanggan: d.customer_name, phone: d.phone, total: d.amount, terbayar: d.paid_amount, sisa: d.outstanding, status: d.status, catatan: d.notes })))}>Export Utang</button>
              <button className="secondary" onClick={() => exportCsv("produk-catatagen.csv", products.map((p) => ({ nama: p.name, barcode: p.barcode, kategori: p.category_name, harga_beli: p.buy_price, harga_jual: p.sell_price, stok: p.stock, min_stok: p.min_stock })))}>Export Produk</button>
            </div>
            <div className="db-box"><strong>Database lokal</strong><span>{dbPath || "—"}</span></div>
          </div>
          <div className="card span-all">
            <div className="card-header"><div><h2>Backup & Restore</h2><p>Backup disimpan lokal di folder data aplikasi. Sebelum restore, aplikasi otomatis membuat backup cadangan.</p></div><button onClick={handleCreateBackup} disabled={saving}>Buat Backup</button></div>
            {backups.length === 0 ? <div className="empty-state compact"><strong>Belum ada backup</strong><span>Klik Buat Backup untuk menyimpan salinan database.</span></div> : (
              <div className="backup-list">
                {backups.map((backup) => (
                  <div key={backup.path} className="backup-row">
                    <div><strong>{backup.name}</strong><small>{backup.path}</small><small>{Math.ceil(backup.size / 1024)} KB</small></div>
                    <button className="secondary" onClick={() => handleRestoreBackup(backup)} disabled={saving}>Restore</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </>
    );
  }


  function renderActiveView() {
    if (activeView === "pos") return <POSPage categories={categories} products={filteredProducts} cart={cart} cartTotal={cartTotal} paymentMethod={paymentMethod} settlementAccountId={settlementAccountId} settlementAccounts={settlementAccounts} saving={saving} posCategoryFilter={posCategoryFilter} onCategoryFilterChange={setPosCategoryFilter} onAddToCart={addToCart} onUpdateQty={updateCartQty} onPaymentMethodChange={setPaymentMethod} onSettlementAccountChange={setSettlementAccountId} onHoldCart={holdCart} onClearCart={clearCart} onSubmitCheckout={submitCheckout} />;
    if (activeView === "brilink") return <AgentServicesPage accounts={accounts} transactions={transactions} agentForm={agentForm} agentStep={agentStep} saving={saving} onAgentFormChange={setAgentForm} onAgentStepChange={setAgentStep} onApplyPreset={applyAgentPreset} onSubmitAgentTransaction={submitAgentTransaction} />;
    if (activeView === "products") return <ProductMasterPage categories={categories} products={filteredProducts} onAddCategory={() => setShowCategoryModal(true)} onAddProduct={() => { clearProductForm(); setShowProductModal(true); }} onEditProduct={startEditProduct} onRemoveProduct={removeProduct} />;
    if (activeView === "history") return renderHistory();
    if (activeView === "debts") return renderDebts();
    if (activeView === "rekeningKoran") return renderRekeningKoran();
    if (activeView === "cash") return <CashBalancePage accounts={accounts} mutations={accountMutations} onAddAccount={() => setCashModal("account")} onTransfer={(account) => { if (account) setTransferForm({ ...transferForm, from_account_id: String(account.id) }); setCashModal("transfer"); }} onAdjust={(account) => { setAdjustForm({ ...adjustForm, account_id: String(account.id) }); setCashModal("adjust"); }} onOwnerDraw={(account) => { setOwnerDrawForm({ ...ownerDrawForm, account_id: String(account.id) }); setCashModal("ownerDraw"); }} onBankFee={(account) => { setBankFeeForm({ ...bankFeeForm, account_id: String(account.id) }); setCashModal("bankFee"); }} />;
    if (activeView === "reports") return renderReports();
    if (activeView === "logs") return renderLogs();
    if (activeView === "settings") return renderSettings();
    return renderDashboard();
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
