import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  User,
  Lock,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
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

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function paymentLabel(method: string) {
  if (method === "cash") return "Tunai";
  if (method === "transfer") return "Transfer";
  if (method === "qris") return "QRIS";
  if (method === "mixed") return "Campuran";
  return method;
}

function mutationLabel(type: string) {
  const labels: Record<string, string> = {
    initial_balance: "Saldo Awal",
    adjustment: "Penyesuaian",
    pos_in: "POS Tunai",
    pos_transfer_in: "POS Transfer",
    pos_qris_in: "POS QRIS",
    transfer_out: "Transfer Keluar",
    transfer_in: "Transfer Masuk",
    owner_draw: "Prive Owner",
    bank_fee: "Biaya Bank/MDR",
    agent_cash_effect: "Efek Kas Agen",
    agent_bank_effect: "Efek Rekening Agen",
  };
  return labels[type] || type;
}

function parseCurrencyInput(value: string, allowNegative = false) {
  const negative = allowNegative && value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return negative ? "-" : "";
  return `${negative ? "-" : ""}${Number(digits)}`;
}

function CurrencyInput({
  value,
  onChange,
  allowNegative = false,
  placeholder = "Rp0",
}: {
  value: string;
  onChange: (value: string) => void;
  allowNegative?: boolean;
  placeholder?: string;
}) {
  const displayValue = value && value !== "-" ? formatRupiah(Number(value)) : value;
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={(event) => onChange(parseCurrencyInput(event.target.value, allowNegative))}
      onFocus={(event) => event.currentTarget.select()}
    />
  );
}

type CartItem = { product: ProductRow; quantity: number };
type ReceiptState = {
  invoice_no: string;
  payment_method: "cash" | "transfer" | "qris";
  total_amount: number;
  created_at: string;
  items: CartItem[];
};
type ViewKey = "dashboard" | "pos" | "brilink" | "products" | "history" | "debts" | "rekeningKoran" | "cash" | "reports" | "logs" | "settings";
type IconName = "dashboard" | "pos" | "brilink" | "products" | "history" | "debts" | "rekeningKoran" | "cash" | "reports" | "logs" | "settings" | "search";

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

const iconMap: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  brilink: Landmark,
  products: Package,
  history: ClipboardList,
  debts: ReceiptText,
  rekeningKoran: ScrollText,
  cash: Wallet,
  reports: BarChart3,
  logs: FileText,
  settings: Settings,
  search: Search,
};

function Icon({ name }: { name: IconName }) {
  const LucideIcon = iconMap[name] || Search;
  return <LucideIcon size={20} strokeWidth={2.2} aria-hidden />;
}

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
  const [cashModal, setCashModal] = useState<null | "account" | "adjust" | "transfer" | "ownerDraw" | "bankFee">(null);
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
  const [agentForm, setAgentForm] = useState({ service_name: "Tarik Tunai", customer_name: "", amount: "0", fee: "5000", provider_cost: "0", account_id: "", cash_effect: "0", bank_effect: "0", notes: "" });
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

  function authShell(kind: "setup" | "login") {
    const isSetup = kind === "setup";
    const usernameValue = isSetup ? form.username : loginForm.username;
    const passwordValue = isSetup ? form.password : loginForm.password;
    return (
      <main className="login-shell">
        <section className="login-brand-panel">
          <div className="login-brand-content">
            <div className="login-logo-row">
              <div className="brand-mark">CA</div>
              <div>
                <h1>CatatAgen</h1>
                <p>POS Retail & Ledger Agen Mikro</p>
              </div>
            </div>
            <div className="login-copy">
              <p className="eyebrow">Local-first Desktop</p>
              <h2>{isSetup ? "Siapkan toko pertama Anda" : "Selamat datang kembali"}</h2>
              <p>Kelola kasir POS, layanan agen non-API, saldo virtual, stok produk, dan buku utang dalam satu aplikasi ringan.</p>
            </div>
            <div className="login-feature-list">
              <div><Zap size={18} /><span>Transaksi cepat untuk kasir harian</span></div>
              <div><ShieldCheck size={18} /><span>Data tersimpan lokal di perangkat</span></div>
              <div><Wallet size={18} /><span>Kas, rekening, QRIS, dan utang tercatat rapi</span></div>
            </div>
          </div>
        </section>
        <section className="login-form-panel">
          <div className="login-mobile-brand">
            <div className="brand-mark small">CA</div>
            <div><strong>CatatAgen</strong><small>Local Edition</small></div>
          </div>
          <div className="login-card">
            <div className="login-card-header">
              <p className="eyebrow">{isSetup ? "Setup Awal" : "Masuk"}</p>
              <h2>{isSetup ? "Buat Admin Pertama" : "Masuk ke Aplikasi"}</h2>
              <p>{isSetup ? "Akun ini akan menjadi owner/admin toko." : "Gunakan akun owner atau kasir yang sudah dibuat."}</p>
            </div>
            <form onSubmit={isSetup ? submitSetup : submitLogin} className="login-form">
              {isSetup && (
                <label>Nama Owner
                  <div className="login-input-wrap"><User size={20} /><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama pemilik toko" /></div>
                </label>
              )}
              <label>Username
                <div className="login-input-wrap"><User size={20} /><input autoFocus={!isSetup} value={usernameValue} onChange={(e) => isSetup ? setForm({ ...form, username: e.target.value }) : setLoginForm({ ...loginForm, username: e.target.value })} placeholder="Masukkan username" /></div>
              </label>
              <label>Password
                <div className="login-input-wrap"><Lock size={20} /><input type={showAuthPassword ? "text" : "password"} value={passwordValue} onChange={(e) => isSetup ? setForm({ ...form, password: e.target.value }) : setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Masukkan password" /><button type="button" className="input-icon-button" onClick={() => setShowAuthPassword(!showAuthPassword)} aria-label={showAuthPassword ? "Sembunyikan password" : "Lihat password"}>{showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              </label>
              <button className="login-submit" type="submit" disabled={saving}>{saving ? "Memproses..." : isSetup ? "Buat Admin" : <>Masuk <ArrowRight size={20} /></>}</button>
            </form>
            <div className="status-line">{message || "Database lokal siap digunakan."}</div>
          </div>
        </section>
      </main>
    );
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

  function productList(showSellButton = true) {
    const visibleProducts = filteredProducts;
    return (
      <div className={showSellButton ? "pos-product-grid" : "admin-product-list"}>
        {visibleProducts.length === 0 ? <div className="empty-state"><strong>Produk tidak ditemukan</strong><span>Tambahkan produk baru atau ubah kata kunci pencarian.</span></div> : visibleProducts.map((product) => (
          <div key={product.id} className={showSellButton ? "pos-product-card" : "admin-product-row"}>
            <div className="product-main">
              <strong>{product.name}</strong>
              <small>{product.category_name || "Tanpa kategori"} • {product.unit}</small>
              {!showSellButton && <small>HPP {formatRupiah(product.buy_price)} • Jual {formatRupiah(product.sell_price)}</small>}
            </div>
            <div className="product-meta">
              <strong>{formatRupiah(product.sell_price)}</strong>
              <span className={product.stock <= product.min_stock ? "stock-badge danger-stock" : "stock-badge"}>Stok {product.stock}</span>
            </div>
            <div className="product-actions">
              {showSellButton ? <button onClick={() => addToCart(product)} disabled={product.stock <= 0}>Tambah</button> : <><button className="secondary" onClick={() => startEditProduct(product)}>Edit</button><button className="danger" onClick={() => removeProduct(product)}>Nonaktifkan</button></>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderPos() {
    const canChoosePayment = cart.length > 0;
    const canPay = canChoosePayment && (paymentMethod === "cash" || Boolean(settlementAccountId));
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Penjualan Retail</p><h1>Kasir POS</h1></div><div className="page-actions"><button className="secondary" onClick={holdCart} disabled={!cart.length}>Hold</button><button className="danger" onClick={clearCart} disabled={!cart.length}>Kosongkan</button></div></div>
        <div className="pos-shell">
          <section className="pos-catalog card">
            <div className="card-header"><div><h2>Pilih Produk</h2><p>Mirip mode kasir Electron: filter kategori, pilih produk, lalu bayar dari panel kanan.</p></div></div>
            <div className="category-filter-row">
              <button className={posCategoryFilter === "all" ? "filter-chip active" : "filter-chip"} onClick={() => setPosCategoryFilter("all")}>Semua</button>
              {categories.map((category) => (
                <button key={category.id} className={posCategoryFilter === String(category.id) ? "filter-chip active" : "filter-chip"} onClick={() => setPosCategoryFilter(String(category.id))}>{category.name}</button>
              ))}
            </div>
            {productList(true)}
          </section>
          <aside className="pos-cart-panel card">
            <div className="card-header"><div><h2>Keranjang</h2><p>{cart.length} item dipilih.</p></div></div>
            {cart.length === 0 ? <div className="empty-state"><strong>Keranjang kosong</strong><span>Pilih produk dari katalog.</span></div> : cart.map((item) => (
              <div key={item.product.id} className="cart-row electron-cart-row">
                <div><strong>{item.product.name}</strong><small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small></div>
                <input type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(e) => updateCartQty(item.product.id, Number(e.target.value))} />
                <strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong>
              </div>
            ))}
            <div className="total-row"><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
            <div className="payment-choice-grid compact-payment-grid">
              {(["cash", "transfer", "qris"] as const).map((method) => (
                <button key={method} className={paymentMethod === method ? "choice-card selected" : "choice-card"} onClick={() => setPaymentMethod(method)}>
                  <strong>{method === "cash" ? "Tunai" : method.toUpperCase()}</strong>
                </button>
              ))}
            </div>
            {paymentMethod !== "cash" && (
              <label>Rekening Penerima<select value={settlementAccountId} onChange={(e) => setSettlementAccountId(e.target.value)}>
                <option value="">Pilih rekening</option>
                {settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
              </select></label>
            )}
            <button className="checkout" onClick={submitCheckout} disabled={saving || !canPay}>{saving ? "Memproses..." : `Bayar ${paymentMethod === "cash" ? "Tunai" : paymentMethod.toUpperCase()}`}</button>
            <p className="hint">Shortcut kasir: pilih produk → cek total → bayar. Struk muncul setelah checkout.</p>
          </aside>
        </div>
      </>
    );
  }

  function renderBrilink() {
    const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
    const totalCustomerPay = Number(agentForm.amount || 0) + Number(agentForm.fee || 0);
    const agentProfit = Number(agentForm.fee || 0) - Number(agentForm.provider_cost || 0);
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Non-API Ledger</p><h1>Layanan Agen</h1></div><div className="page-actions"><button className="secondary" onClick={() => setAgentStep(1)}>Pilih Layanan</button><button onClick={() => setAgentStep(4)}>Review</button></div></div>
        <div className="stepper agent-stepper">
          <button className={agentStep === 1 ? "step active" : "step"} onClick={() => setAgentStep(1)}><span>1</span>Pilih Layanan</button>
          <button className={agentStep === 2 ? "step active" : "step"} onClick={() => setAgentStep(2)}><span>2</span>Nominal</button>
          <button className={agentStep === 3 ? "step active" : "step"} onClick={() => setAgentStep(3)}><span>3</span>Efek Saldo</button>
          <button className={agentStep === 4 ? "step active" : "step"} onClick={() => setAgentStep(4)}><span>4</span>Simpan</button>
        </div>
        <section className="grid workspace-grid">
          <div className="card">
            {agentStep === 1 && (
              <div className="workflow-content">
                <div className="card-header"><div><h2>1. Pilih Jenis Layanan</h2><p>Pilih preset yang paling mendekati transaksi pelanggan.</p></div></div>
                <div className="service-section-title">Layanan Favorit</div>
                <div className="service-card-grid">
                  <button type="button" className="service-card" onClick={() => applyAgentPreset("withdraw")}><span className="service-icon">TT</span><strong>Tarik Tunai</strong><small>Pelanggan ambil uang tunai</small><em>Admin umum Rp5.000</em></button>
                  <button type="button" className="service-card" onClick={() => applyAgentPreset("deposit")}><span className="service-icon">ST</span><strong>Setor Tunai</strong><small>Setor ke rekening/e-wallet</small><em>Admin umum Rp5.000</em></button>
                  <button type="button" className="service-card" onClick={() => applyAgentPreset("transfer")}><span className="service-icon">TR</span><strong>Transfer</strong><small>Transfer bank/provider</small><em>Admin umum Rp5.000</em></button>
                  <button type="button" className="service-card" onClick={() => applyAgentPreset("payment")}><span className="service-icon">TP</span><strong>Payment/Topup</strong><small>Token, pulsa, tagihan</small><em>Admin mulai Rp2.500</em></button>
                </div>
                <label>Nama Layanan<input value={agentForm.service_name} onChange={(e) => setAgentForm({ ...agentForm, service_name: e.target.value })} /></label>
                <button onClick={() => setAgentStep(2)}>Lanjut Isi Nominal</button>
              </div>
            )}
            {agentStep === 2 && (
              <div className="workflow-content">
                <div className="card-header"><div><h2>2. Isi Nominal</h2><p>Pisahkan nominal transaksi dan admin toko agar profit jelas.</p></div></div>
                <div className="product-form no-box">
                  <label>Nama Pelanggan<input value={agentForm.customer_name} onChange={(e) => setAgentForm({ ...agentForm, customer_name: e.target.value })} /></label>
                  <label>Nominal Transaksi<span className="field-note">Nilai uang transfer/pulsa/token.</span><CurrencyInput value={agentForm.amount} onChange={(value) => setAgentForm({ ...agentForm, amount: value })} /></label>
                  <label>Admin Toko / Fee<span className="field-note">Biaya admin yang dibayar pelanggan.</span><CurrencyInput value={agentForm.fee} onChange={(value) => setAgentForm({ ...agentForm, fee: value })} /></label>
                  <label>Biaya Modal Provider<span className="field-note">Potongan provider/bank. Profit = Admin Toko - Biaya Modal.</span><CurrencyInput value={agentForm.provider_cost} onChange={(value) => setAgentForm({ ...agentForm, provider_cost: value })} /></label>
                  <label>Catatan<input value={agentForm.notes} onChange={(e) => setAgentForm({ ...agentForm, notes: e.target.value })} /></label>
                </div>
                <div className="total-row"><span>Total Bayar Pelanggan</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
                <div className="total-row"><span>Estimasi Profit Jasa</span><strong>{formatRupiah(agentProfit)}</strong></div>
                <div className="wizard-actions"><button className="secondary" onClick={() => setAgentStep(1)}>Kembali</button><button onClick={() => setAgentStep(3)}>Lanjut Efek Saldo</button></div>
              </div>
            )}
            {agentStep === 3 && (
              <div className="workflow-content">
                <div className="card-header"><div><h2>3. Atur Efek Saldo</h2><p>Isi hanya saldo yang benar-benar berubah. Positif menambah, negatif mengurangi.</p></div></div>
                <div className="product-form no-box">
                  <label>Rekening Layanan<select value={agentForm.account_id} onChange={(e) => setAgentForm({ ...agentForm, account_id: e.target.value })}>
                    <option value="">Tidak ada efek rekening</option>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select></label>
                  <label>Perubahan Saldo Rekening<span className="field-note">Contoh transfer keluar: -100000</span><CurrencyInput allowNegative value={agentForm.bank_effect} onChange={(value) => setAgentForm({ ...agentForm, bank_effect: value })} /></label>
                  <label>Perubahan Kas Tunai<span className="field-note">Contoh pelanggan bayar tunai: 105000</span><CurrencyInput allowNegative value={agentForm.cash_effect} onChange={(value) => setAgentForm({ ...agentForm, cash_effect: value })} /></label>
                </div>
                <div className="wizard-actions"><button className="secondary" onClick={() => setAgentStep(2)}>Kembali</button><button onClick={() => setAgentStep(4)}>Review & Simpan</button></div>
              </div>
            )}
            {agentStep === 4 && (
              <div className="workflow-content">
                <div className="card-header"><div><h2>4. Review Transaksi</h2><p>Pastikan ringkasan sudah benar sebelum disimpan.</p></div></div>
                <div className="review-box">
                  <div><span>Layanan</span><strong>{agentForm.service_name || "-"}</strong></div>
                  <div><span>Nominal</span><strong>{formatRupiah(Number(agentForm.amount || 0))}</strong></div>
                  <div><span>Admin/Fee</span><strong>{formatRupiah(Number(agentForm.fee || 0))}</strong></div>
                  <div><span>Biaya Modal Provider</span><strong>{formatRupiah(Number(agentForm.provider_cost || 0))}</strong></div>
                  <div><span>Profit Jasa</span><strong>{formatRupiah(agentProfit)}</strong></div>
                  <div><span>Total Bayar</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
                  <div><span>Efek Rekening</span><strong>{formatRupiah(Number(agentForm.bank_effect || 0))}</strong></div>
                  <div><span>Efek Kas</span><strong>{formatRupiah(Number(agentForm.cash_effect || 0))}</strong></div>
                </div>
                <div className="wizard-actions"><button className="secondary" onClick={() => setAgentStep(3)}>Kembali</button><button onClick={(event) => submitAgentTransaction(event as unknown as React.FormEvent)} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Transaksi Agen"}</button></div>
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-header"><div><h2>Riwayat Layanan Agen</h2><p>Transaksi yang sudah dicatat hari ini/terakhir.</p></div></div>
            {agentTransactions.length === 0 ? <div className="empty-state"><strong>Belum ada transaksi agen</strong><span>Mulai dari langkah 1 untuk mencatat layanan.</span></div> : agentTransactions.map((transaction) => (
              <div key={transaction.id} className="row rich-row">
                <div><strong>{transaction.notes || transaction.invoice_no}</strong><small>{transaction.invoice_no} • Fee {formatRupiah(transaction.profit)}</small></div>
                <strong>{formatRupiah(transaction.total_amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderProducts() {
    return (
      <>
        <div className="page-title">
          <div><p className="eyebrow">Data Master</p><h1>Produk & Kategori</h1></div>
          <div className="page-actions">
            <button className="secondary" onClick={() => setShowCategoryModal(true)}>Tambah Kategori</button>
            <button onClick={() => { clearProductForm(); setShowProductModal(true); }}>Tambah Produk</button>
          </div>
        </div>
        <div className="page-help"><strong>Halaman ini dibuat bersih:</strong><span>Daftar produk fokus di satu halaman.</span><span>Tambah/edit produk dibuka lewat dialog agar tidak menumpuk.</span></div>
        <section className="grid product-master-grid">
          <div className="card">
            <div className="card-header"><div><h2>Kategori</h2><p>Gunakan kategori untuk mempercepat pencarian produk di kasir.</p></div></div>
            {categories.length === 0 ? <div className="empty-state compact"><strong>Belum ada kategori</strong><span>Klik Tambah Kategori untuk membuat kategori pertama.</span></div> : (
              <div className="category-chip-list">
                {categories.map((category) => <span key={category.id} className="category-chip">{category.name}</span>)}
              </div>
            )}
          </div>
          <div className="card product-list-card">
            <div className="card-header"><div><h2>Daftar Produk</h2><p>{filteredProducts.length} produk ditampilkan. Gunakan pencarian di atas untuk memfilter.</p></div></div>
            {productList(false)}
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

  function renderCash() {
    return (
      <>
        <div className="page-title">
          <div><p className="eyebrow">Saldo Virtual</p><h1>Kas & Saldo</h1></div>
          <div className="page-actions">
            <button className="secondary" onClick={() => setCashModal("account")}>Tambah Rekening</button>
            <button onClick={() => setCashModal("transfer")}>Transfer Saldo</button>
          </div>
        </div>
        <div className="page-help"><strong>Tujuan halaman:</strong><span>Pantau uang tunai, rekening bank, QRIS, dan mutasi saldo tanpa membuka internet banking.</span></div>
        <section className="stat-grid balance-grid">
          {accounts.map((account) => (
            <div key={account.id} className="balance-card">
              <span>{account.code}</span>
              <h2>{account.name}</h2>
              <strong>{formatRupiah(account.balance)}</strong>
              <small>Minimum: {formatRupiah(account.min_balance || 0)}</small>
              <div className="account-card-actions">
                <button className="secondary" onClick={() => { setAdjustForm({ ...adjustForm, account_id: String(account.id) }); setCashModal("adjust"); }}>Sesuaikan</button>
                <button className="secondary" onClick={() => { setTransferForm({ ...transferForm, from_account_id: String(account.id) }); setCashModal("transfer"); }}>Transfer</button>
                <button className="secondary" onClick={() => { setOwnerDrawForm({ ...ownerDrawForm, account_id: String(account.id) }); setCashModal("ownerDraw"); }}>Prive</button>
                <button className="secondary" onClick={() => { setBankFeeForm({ ...bankFeeForm, account_id: String(account.id) }); setCashModal("bankFee"); }}>Biaya</button>
              </div>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="card-header"><div><h2>Mutasi Saldo Terakhir</h2><p>Riwayat perubahan kas, rekening, QRIS, biaya, dan transaksi agen.</p></div></div>
          {accountMutations.length === 0 ? <div className="empty-state compact"><strong>Belum ada mutasi saldo</strong><span>Mutasi muncul setelah POS, transaksi agen, atau aksi saldo.</span></div> : accountMutations.map((mutation) => (
            <div key={mutation.id} className="row rich-row">
              <div><strong>{mutation.account_name}</strong><small>{mutationLabel(mutation.mutation_type)} • {mutation.notes || "-"}</small></div>
              <div className="amount-stack"><strong className={mutation.amount < 0 ? "negative" : "positive"}>{formatRupiah(mutation.amount)}</strong><small>Saldo: {formatRupiah(mutation.balance_after)}</small></div>
            </div>
          ))}
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


  function renderCashModals() {
    if (!cashModal) return null;
    const title = cashModal === "account" ? "Tambah Rekening" : cashModal === "adjust" ? "Sesuaikan Saldo" : cashModal === "transfer" ? "Transfer Antar Rekening" : cashModal === "ownerDraw" ? "Prive Owner" : "Biaya Bank/MDR";
    return (
      <div className="modal-backdrop">
        <section className="dialog-card product-dialog">
          <div className="card-header">
            <div><p className="eyebrow">Kas & Saldo</p><h2>{title}</h2></div>
            <button className="secondary" onClick={() => setCashModal(null)}>Tutup</button>
          </div>
          {cashModal === "account" && (
            <form onSubmit={submitAccount} className="dialog-form product-form no-box">
              <label>Kode<input value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="bri / bca / qris" /></label>
              <label>Nama<input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Rekening BRI" /></label>
              <label>Saldo Awal<CurrencyInput value={accountForm.initial_balance} onChange={(value) => setAccountForm({ ...accountForm, initial_balance: value })} /></label>
              <label>Saldo Minimum<CurrencyInput value={accountForm.min_balance} onChange={(value) => setAccountForm({ ...accountForm, min_balance: value })} /></label>
              <div className="modal-actions span-2"><button className="secondary" type="button" onClick={() => setCashModal(null)}>Batal</button><button type="submit" disabled={saving}>Tambah Rekening</button></div>
            </form>
          )}
          {cashModal === "adjust" && (
            <form onSubmit={submitAdjustment} className="dialog-form product-form no-box">
              <label>Rekening<select value={adjustForm.account_id} onChange={(e) => setAdjustForm({ ...adjustForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label>Nominal (+ / -)<CurrencyInput allowNegative value={adjustForm.amount} onChange={(value) => setAdjustForm({ ...adjustForm, amount: value })} /></label>
              <label className="span-2">Catatan<input value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} /></label>
              <div className="modal-actions span-2"><button className="secondary" type="button" onClick={() => setCashModal(null)}>Batal</button><button type="submit" disabled={saving || !adjustForm.account_id}>Simpan</button></div>
            </form>
          )}
          {cashModal === "transfer" && (
            <form onSubmit={submitTransfer} className="dialog-form product-form no-box">
              <label>Dari<select value={transferForm.from_account_id} onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}><option value="">Pilih asal</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label>Ke<select value={transferForm.to_account_id} onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}><option value="">Pilih tujuan</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label>Nominal<CurrencyInput value={transferForm.amount} onChange={(value) => setTransferForm({ ...transferForm, amount: value })} /></label>
              <label>Catatan<input value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} /></label>
              <div className="modal-actions span-2"><button className="secondary" type="button" onClick={() => setCashModal(null)}>Batal</button><button type="submit" disabled={saving || !transferForm.from_account_id || !transferForm.to_account_id}>Transfer</button></div>
            </form>
          )}
          {cashModal === "ownerDraw" && (
            <form onSubmit={submitOwnerDraw} className="dialog-form product-form no-box">
              <label>Rekening<select value={ownerDrawForm.account_id} onChange={(e) => setOwnerDrawForm({ ...ownerDrawForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label>Nominal<CurrencyInput value={ownerDrawForm.amount} onChange={(value) => setOwnerDrawForm({ ...ownerDrawForm, amount: value })} /></label>
              <label className="span-2">Catatan<input value={ownerDrawForm.notes} onChange={(e) => setOwnerDrawForm({ ...ownerDrawForm, notes: e.target.value })} /></label>
              <div className="modal-actions span-2"><button className="secondary" type="button" onClick={() => setCashModal(null)}>Batal</button><button type="submit" disabled={saving || !ownerDrawForm.account_id}>Catat Prive</button></div>
            </form>
          )}
          {cashModal === "bankFee" && (
            <form onSubmit={submitBankFee} className="dialog-form product-form no-box">
              <label>Rekening<select value={bankFeeForm.account_id} onChange={(e) => setBankFeeForm({ ...bankFeeForm, account_id: e.target.value })}><option value="">Pilih rekening</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label>Nominal<CurrencyInput value={bankFeeForm.amount} onChange={(value) => setBankFeeForm({ ...bankFeeForm, amount: value })} /></label>
              <label className="span-2">Catatan<input value={bankFeeForm.notes} onChange={(e) => setBankFeeForm({ ...bankFeeForm, notes: e.target.value })} /></label>
              <div className="modal-actions span-2"><button className="secondary" type="button" onClick={() => setCashModal(null)}>Batal</button><button type="submit" disabled={saving || !bankFeeForm.account_id}>Catat Biaya</button></div>
            </form>
          )}
        </section>
      </div>
    );
  }

  function renderProductModals() {
    return (
      <>
        {showCategoryModal && (
          <div className="modal-backdrop">
            <section className="dialog-card small-dialog">
              <div className="card-header">
                <div><p className="eyebrow">Kategori</p><h2>Tambah Kategori</h2></div>
                <button className="secondary" onClick={() => setShowCategoryModal(false)}>Tutup</button>
              </div>
              <form onSubmit={submitCategory} className="dialog-form">
                <label>Nama Kategori<input autoFocus placeholder="Contoh: Rokok, Snack, Aksesoris" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} /></label>
                <div className="modal-actions"><button className="secondary" type="button" onClick={() => setShowCategoryModal(false)}>Batal</button><button type="submit" disabled={saving}>Simpan Kategori</button></div>
              </form>
            </section>
          </div>
        )}
        {showProductModal && (
          <div className="modal-backdrop">
            <section className="dialog-card product-dialog">
              <div className="card-header">
                <div><p className="eyebrow">Produk</p><h2>{editingProductId ? "Edit Produk" : "Tambah Produk"}</h2></div>
                <button className="secondary" onClick={() => { setShowProductModal(false); clearProductForm(); }}>Tutup</button>
              </div>
              <form onSubmit={submitProduct} className="dialog-form product-form no-box">
                <label>Nama Produk<input autoFocus value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
                <label>Barcode<input value={productForm.barcode} onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} placeholder="Opsional" /></label>
                <label>Kategori<select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                  <option value="">Tanpa kategori</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select></label>
                <label>Satuan<input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></label>
                <label>Harga Beli / HPP<CurrencyInput value={productForm.buy_price} onChange={(value) => setProductForm({ ...productForm, buy_price: value })} /></label>
                <label>Harga Jual<CurrencyInput value={productForm.sell_price} onChange={(value) => setProductForm({ ...productForm, sell_price: value })} /></label>
                <label>Stok<input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label>
                <label>Minimum Stok<input type="number" min="0" value={productForm.min_stock} onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })} /></label>
                <div className="modal-actions span-2"><button className="secondary" type="button" onClick={() => { setShowProductModal(false); clearProductForm(); }}>Batal</button><button type="submit" disabled={saving}>{editingProductId ? "Simpan Perubahan" : "Simpan Produk"}</button></div>
              </form>
            </section>
          </div>
        )}
      </>
    );
  }

  function renderReceiptModal() {
    if (!lastReceipt) return null;
    return (
      <div className="modal-backdrop">
        <section className="receipt-modal">
          <div className="card-header">
            <div><p className="eyebrow">Transaksi Berhasil</p><h2>Struk Penjualan</h2></div>
            <button className="secondary" onClick={() => setLastReceipt(null)}>Tutup</button>
          </div>
          <div className="receipt-paper printable-receipt">
            <div className="receipt-center">
              <strong>CatatAgen Local</strong>
              <span>Struk POS Retail</span>
            </div>
            <div className="receipt-line" />
            <div className="receipt-meta"><span>Invoice</span><strong>{lastReceipt.invoice_no}</strong></div>
            <div className="receipt-meta"><span>Waktu</span><strong>{lastReceipt.created_at}</strong></div>
            <div className="receipt-meta"><span>Bayar</span><strong>{paymentLabel(lastReceipt.payment_method)}</strong></div>
            <div className="receipt-line" />
            {lastReceipt.items.map((item) => (
              <div key={item.product.id} className="receipt-item">
                <div><strong>{item.product.name}</strong><span>{item.quantity} x {formatRupiah(item.product.sell_price)}</span></div>
                <strong>{formatRupiah(item.quantity * item.product.sell_price)}</strong>
              </div>
            ))}
            <div className="receipt-line" />
            <div className="receipt-total"><span>Total</span><strong>{formatRupiah(lastReceipt.total_amount)}</strong></div>
            <div className="receipt-center receipt-footer"><span>Terima kasih</span><span>Simpan struk ini sebagai bukti transaksi.</span></div>
          </div>
          <div className="modal-actions">
            <button onClick={() => window.print()}>Print Struk</button>
            <button className="secondary" onClick={() => navigator.clipboard.writeText(`CatatAgen ${lastReceipt.invoice_no}\nTotal: ${formatRupiah(lastReceipt.total_amount)}\nBayar: ${paymentLabel(lastReceipt.payment_method)}`)}>Salin Ringkasan</button>
          </div>
        </section>
      </div>
    );
  }

  function renderActiveView() {
    if (activeView === "pos") return renderPos();
    if (activeView === "brilink") return renderBrilink();
    if (activeView === "products") return renderProducts();
    if (activeView === "history") return renderHistory();
    if (activeView === "debts") return renderDebts();
    if (activeView === "rekeningKoran") return renderRekeningKoran();
    if (activeView === "cash") return renderCash();
    if (activeView === "reports") return renderReports();
    if (activeView === "logs") return renderLogs();
    if (activeView === "settings") return renderSettings();
    return renderDashboard();
  }

  if (setupNeeded) return authShell("setup");
  if (!user) return authShell("login");

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
      {renderCashModals()}
      {renderProductModals()}
      {renderReceiptModal()}
    </div>
  );
}
