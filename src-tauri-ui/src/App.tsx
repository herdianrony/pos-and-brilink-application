import { useEffect, useMemo, useState } from "react";
import {
  AccountMutationRow,
  AccountRow,
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
  listCategories,
  listDebts,
  listProducts,
  listTransactionItems,
  listTransactions,
  listUsers,
  login,
  ownerDraw,
  setupStatus,
  transferAccounts,
  updateProduct,
} from "./api";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

type CartItem = { product: ProductRow; quantity: number };
type ViewKey = "dashboard" | "pos" | "brilink" | "products" | "history" | "debts" | "rekeningKoran" | "cash" | "reports" | "settings";
type IconName = "dashboard" | "pos" | "brilink" | "products" | "history" | "debts" | "rekeningKoran" | "cash" | "reports" | "settings" | "search";

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
  { id: "settings", label: "Pengaturan", icon: "settings", adminOnly: true },
];

function Icon({ name }: { name: IconName }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "dashboard") return <svg {...common}><rect x="3" y="3" width="7" height="8" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="15" width="7" height="6" rx="2" /></svg>;
  if (name === "pos") return <svg {...common}><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H7" /><path d="M10 11h6" /></svg>;
  if (name === "brilink") return <svg {...common}><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-7h6v7" /><path d="M9 10h.01" /><path d="M15 10h.01" /></svg>;
  if (name === "rekeningKoran") return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h6" /></svg>;
  if (name === "reports") return <svg {...common}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="5" rx="1" /><rect x="12" y="8" width="3" height="9" rx="1" /><rect x="17" y="5" width="3" height="12" rx="1" /></svg>;
  if (name === "products") return <svg {...common}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>;
  if (name === "history") return <svg {...common}><path d="M8 3H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V5a2 2 0 0 0-2-2h-2" /><path d="M9 7h6" /><path d="M9 11h6" /><path d="M9 15h4" /></svg>;
  if (name === "debts") return <svg {...common}><path d="M16 3h5v5" /><path d="m21 3-7 7" /><path d="M12 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /><path d="M7 14h6" /><path d="M7 18h4" /></svg>;
  if (name === "cash") return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9v.01" /><path d="M18 15v.01" /></svg>;
  if (name === "settings") return <svg {...common}><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 3.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.15.4.38.74.7 1 .32.25.7.4 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6Z" /></svg>;
  return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [posStep, setPosStep] = useState<1 | 2 | 3>(1);
  const [agentStep, setAgentStep] = useState<1 | 2 | 3 | 4>(1);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountMutations, setAccountMutations] = useState<AccountMutationRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<TransactionItemRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [agentForm, setAgentForm] = useState({ service_name: "Tarik Tunai", customer_name: "", amount: "0", fee: "5000", account_id: "", cash_effect: "0", bank_effect: "0", notes: "" });
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
  const filteredProducts = normalizedSearch
    ? products.filter((product) => [product.name, product.barcode || "", product.category_name || ""].join(" ").toLowerCase().includes(normalizedSearch))
    : products;
  const filteredTransactions = normalizedSearch
    ? transactions.filter((transaction) => [transaction.invoice_no, transaction.customer_name || "", transaction.notes || "", transaction.payment_method].join(" ").toLowerCase().includes(normalizedSearch))
    : transactions;
  const filteredDebts = normalizedSearch
    ? debts.filter((debt) => [debt.customer_name, debt.phone || "", debt.notes || ""].join(" ").toLowerCase().includes(normalizedSearch))
    : debts;
  const isAdmin = user?.role === "admin";

  async function refreshData() {
    const [nextAccounts, nextMutations, nextCategories, nextProducts, nextTransactions, nextDebts, nextUsers] = await Promise.all([
      listAccounts(),
      listAccountMutations(),
      listCategories(),
      listProducts(),
      listTransactions(),
      listDebts(),
      listUsers(),
    ]);
    setAccounts(nextAccounts);
    setAccountMutations(nextMutations);
    setCategories(nextCategories);
    setProducts(nextProducts);
    setTransactions(nextTransactions);
    setDebts(nextDebts);
    setUsers(nextUsers);
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

  async function submitCheckout() {
    setSaving(true);
    try {
      const result = await checkoutPosCash({
        payment_method: paymentMethod,
        settlement_account_id: paymentMethod === "cash" ? null : Number(settlementAccountId),
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
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
      await refreshData();
      setMessage("Biaya bank/MDR berhasil dicatat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }


  function applyAgentPreset(kind: "withdraw" | "deposit" | "transfer" | "payment") {
    if (kind === "withdraw") setAgentForm({ ...agentForm, service_name: "Tarik Tunai", cash_effect: "0", bank_effect: "0", fee: "5000" });
    if (kind === "deposit") setAgentForm({ ...agentForm, service_name: "Setor Tunai", cash_effect: "0", bank_effect: "0", fee: "5000" });
    if (kind === "transfer") setAgentForm({ ...agentForm, service_name: "Transfer", cash_effect: "0", bank_effect: "0", fee: "5000" });
    if (kind === "payment") setAgentForm({ ...agentForm, service_name: "Pembayaran / Topup", cash_effect: "0", bank_effect: "0", fee: "2500" });
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
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">CA</div>
          <p className="eyebrow">CatatAgen</p>
          <h1>{isSetup ? "Setup Admin Pertama" : "Masuk ke Aplikasi"}</h1>
          <p className="muted">POS retail, saldo virtual agen, dan buku utang lokal.</p>
          <form onSubmit={isSetup ? submitSetup : submitLogin} className="form">
            {isSetup && <label>Nama<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>}
            <label>Username<input value={isSetup ? form.username : loginForm.username} onChange={(e) => isSetup ? setForm({ ...form, username: e.target.value }) : setLoginForm({ ...loginForm, username: e.target.value })} /></label>
            <label>Password<input type="password" value={isSetup ? form.password : loginForm.password} onChange={(e) => isSetup ? setForm({ ...form, password: e.target.value }) : setLoginForm({ ...loginForm, password: e.target.value })} /></label>
            <button type="submit" disabled={saving}>{saving ? "Memproses..." : isSetup ? "Buat Admin" : "Masuk"}</button>
          </form>
          <div className="status-line">{message || "Menyiapkan aplikasi..."}</div>
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
        <section className="grid dashboard-grid">
          <div className="card">
            <h2>Transaksi Terakhir</h2>
            {filteredTransactions.length === 0 ? <p>Belum ada transaksi.</p> : filteredTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="row rich-row">
                <div><strong>{transaction.invoice_no}</strong><small>{transaction.payment_method.toUpperCase()} • {transaction.status}</small></div>
                <strong>{formatRupiah(transaction.total_amount)}</strong>
              </div>
            ))}
          </div>
          <div className="card">
            <h2>Akun Saldo</h2>
            {accounts.length === 0 ? <p>Belum ada akun.</p> : accounts.map((account) => (
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
      <div className="list product-list">
        {visibleProducts.length === 0 ? <div className="empty-state"><strong>Produk tidak ditemukan</strong><span>Tambahkan produk baru atau ubah kata kunci pencarian.</span></div> : visibleProducts.map((product) => (
          <div key={product.id} className="product-row">
            <div>
              <strong>{product.name}</strong>
              <small>{product.category_name || "Tanpa kategori"} • Stok {product.stock} {product.unit}</small>
            </div>
            <div className="right">
              <strong>{formatRupiah(product.sell_price)}</strong>
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
        <div className="page-title"><div><p className="eyebrow">Penjualan Retail</p><h1>Kasir POS</h1></div></div>
        <div className="stepper">
          <button className={posStep === 1 ? "step active" : "step"} onClick={() => setPosStep(1)}><span>1</span>Pilih Produk</button>
          <button className={posStep === 2 ? "step active" : "step"} onClick={() => setPosStep(2)} disabled={!canChoosePayment}><span>2</span>Cek Keranjang</button>
          <button className={posStep === 3 ? "step active" : "step"} onClick={() => setPosStep(3)} disabled={!canChoosePayment}><span>3</span>Bayar</button>
        </div>
        <section className="cashier-layout">
          <div className={posStep === 1 ? "workflow-panel active" : "workflow-panel"}>
            <div className="card"><div className="card-header"><div><h2>1. Pilih Produk</h2><p>Tekan Tambah untuk memasukkan produk ke keranjang.</p></div></div>{productList(true)}</div>
          </div>
          <div className={posStep === 2 ? "workflow-panel active" : "workflow-panel"}>
            <div className="card">
              <div className="card-header"><div><h2>2. Cek Keranjang</h2><p>Ubah jumlah atau hapus item dengan mengisi 0.</p></div></div>
              {cart.length === 0 ? <div className="empty-state"><strong>Keranjang kosong</strong><span>Pilih produk dulu untuk mulai transaksi.</span></div> : cart.map((item) => (
                <div key={item.product.id} className="cart-row">
                  <div><strong>{item.product.name}</strong><small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small></div>
                  <input type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(e) => updateCartQty(item.product.id, Number(e.target.value))} />
                  <strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong>
                </div>
              ))}
              <div className="total-row"><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
              <button onClick={() => setPosStep(3)} disabled={!canChoosePayment}>Lanjut ke Pembayaran</button>
            </div>
          </div>
          <div className={posStep === 3 ? "workflow-panel active" : "workflow-panel"}>
            <div className="card cart-card">
              <div className="card-header"><div><h2>3. Pembayaran</h2><p>Pilih metode pembayaran dan rekening penerima jika non-tunai.</p></div></div>
              <div className="payment-choice-grid">
                {(["cash", "transfer", "qris"] as const).map((method) => (
                  <button key={method} className={paymentMethod === method ? "choice-card selected" : "choice-card"} onClick={() => setPaymentMethod(method)}>
                    <strong>{method === "cash" ? "Tunai" : method.toUpperCase()}</strong>
                    <span>{method === "cash" ? "Masuk Kas Tunai" : "Masuk rekening penerima"}</span>
                  </button>
                ))}
              </div>
              {paymentMethod !== "cash" && (
                <label>Rekening Penerima<select value={settlementAccountId} onChange={(e) => setSettlementAccountId(e.target.value)}>
                  <option value="">Pilih rekening</option>
                  {settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
                </select></label>
              )}
              <div className="receipt-preview">
                <strong>Ringkasan</strong>
                <span>{cart.length} item</span>
                <b>{formatRupiah(cartTotal)}</b>
              </div>
              <button className="checkout" onClick={submitCheckout} disabled={saving || !canPay}>{saving ? "Memproses..." : `Bayar ${paymentMethod === "cash" ? "Tunai" : paymentMethod.toUpperCase()}`}</button>
            </div>
          </div>
        </section>
      </>
    );
  }


  function renderBrilink() {
    const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
    const totalCustomerPay = Number(agentForm.amount || 0) + Number(agentForm.fee || 0);
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Non-API Ledger</p><h1>Layanan Agen</h1></div></div>
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
                <div className="preset-grid">
                  <button type="button" className="preset-card" onClick={() => applyAgentPreset("withdraw")}><strong>Tarik Tunai</strong><span>Pelanggan ambil uang tunai</span></button>
                  <button type="button" className="preset-card" onClick={() => applyAgentPreset("deposit")}><strong>Setor Tunai</strong><span>Uang tunai masuk, saldo bank bertambah</span></button>
                  <button type="button" className="preset-card" onClick={() => applyAgentPreset("transfer")}><strong>Transfer</strong><span>Saldo rekening keluar untuk transfer</span></button>
                  <button type="button" className="preset-card" onClick={() => applyAgentPreset("payment")}><strong>Payment/Topup</strong><span>Token, pulsa, tagihan, e-wallet</span></button>
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
                  <label>Nominal Transaksi<span className="field-note">Nilai uang transfer/pulsa/token.</span><input type="number" min="0" value={agentForm.amount} onChange={(e) => setAgentForm({ ...agentForm, amount: e.target.value })} /></label>
                  <label>Admin Toko / Fee<span className="field-note">Keuntungan jasa dari pelanggan.</span><input type="number" min="0" value={agentForm.fee} onChange={(e) => setAgentForm({ ...agentForm, fee: e.target.value })} /></label>
                  <label>Catatan<input value={agentForm.notes} onChange={(e) => setAgentForm({ ...agentForm, notes: e.target.value })} /></label>
                </div>
                <div className="total-row"><span>Total Bayar Pelanggan</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
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
                  <label>Perubahan Saldo Rekening<span className="field-note">Contoh transfer keluar: -100000</span><input type="number" value={agentForm.bank_effect} onChange={(e) => setAgentForm({ ...agentForm, bank_effect: e.target.value })} /></label>
                  <label>Perubahan Kas Tunai<span className="field-note">Contoh pelanggan bayar tunai: 105000</span><input type="number" value={agentForm.cash_effect} onChange={(e) => setAgentForm({ ...agentForm, cash_effect: e.target.value })} /></label>
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
        <div className="page-title"><div><p className="eyebrow">Data Master</p><h1>Produk & Kategori</h1></div></div>
        <div className="page-help"><strong>Untuk pemilik/admin:</strong><span>Isi HPP agar laporan profit benar.</span><span>Kasir tidak perlu melihat HPP di versi final.</span></div>
        <section className="grid workspace-grid">
          <div className="card">
            <h2>{editingProductId ? "Edit Produk" : "Tambah Produk"}</h2>
            <form onSubmit={submitCategory} className="inline-form">
              <input placeholder="Kategori baru" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
              <button type="submit" disabled={saving}>Tambah Kategori</button>
            </form>
            <form onSubmit={submitProduct} className="product-form">
              <label>Nama Produk<input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
              <label>Kategori<select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                <option value="">Tanpa kategori</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select></label>
              <label>Harga Beli<input type="number" min="0" value={productForm.buy_price} onChange={(e) => setProductForm({ ...productForm, buy_price: e.target.value })} /></label>
              <label>Harga Jual<input type="number" min="0" value={productForm.sell_price} onChange={(e) => setProductForm({ ...productForm, sell_price: e.target.value })} /></label>
              <label>Stok<input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label>
              <label>Satuan<input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></label>
              <button type="submit" disabled={saving}>{editingProductId ? "Simpan Perubahan" : "Tambah Produk"}</button>
              {editingProductId && <button type="button" className="secondary" onClick={clearProductForm}>Batal Edit</button>}
            </form>
          </div>
          <div className="card"><h2>Daftar Produk</h2>{productList(false)}</div>
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
                    <div><strong>{transaction.invoice_no}</strong><small>{transaction.transaction_type.toUpperCase()} • {transaction.payment_method.toUpperCase()} • {transaction.status}</small></div>
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
        <div className="page-title"><div><p className="eyebrow">Saldo Virtual</p><h1>Kas & Saldo</h1></div></div>
        <div className="page-help"><strong>Tujuan halaman:</strong><span>Pantau uang tunai, rekening bank, QRIS, dan mutasi saldo tanpa membuka internet banking.</span></div>
        <section className="stat-grid balance-grid">
          {accounts.map((account) => (
            <div key={account.id} className="balance-card">
              <span>{account.code}</span>
              <h2>{account.name}</h2>
              <strong>{formatRupiah(account.balance)}</strong>
              <small>Minimum: {formatRupiah(account.min_balance || 0)}</small>
            </div>
          ))}
        </section>
        <section className="grid workspace-grid">
          <div className="card">
            <details className="collapsible" open><summary>Tambah Rekening Non-Tunai</summary>
            <form onSubmit={submitAccount} className="product-form">
              <label>Kode<input value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="bri / bca / qris" /></label>
              <label>Nama<input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Rekening BRI" /></label>
              <label>Saldo Awal<input type="number" min="0" value={accountForm.initial_balance} onChange={(e) => setAccountForm({ ...accountForm, initial_balance: e.target.value })} /></label>
              <label>Saldo Minimum<input type="number" min="0" value={accountForm.min_balance} onChange={(e) => setAccountForm({ ...accountForm, min_balance: e.target.value })} /></label>
              <button type="submit" disabled={saving}>Tambah Rekening</button>
            </form></details>
            <details className="collapsible"><summary>Sesuaikan Saldo</summary>
            <p className="hint">Gunakan untuk koreksi saldo. Nominal positif menambah saldo, nominal negatif mengurangi saldo.</p>
            <form onSubmit={submitAdjustment} className="product-form">
              <label>Rekening<select value={adjustForm.account_id} onChange={(e) => setAdjustForm({ ...adjustForm, account_id: e.target.value })}>
                <option value="">Pilih rekening</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Nominal (+ / -)<input type="number" value={adjustForm.amount} onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })} /></label>
              <label className="span-2">Catatan<input value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving || !adjustForm.account_id}>Simpan Penyesuaian</button>
            </form></details>

            <details className="collapsible"><summary>Transfer Antar Rekening</summary>
            <p className="hint">Gunakan saat memindahkan uang dari kas ke rekening, atau antar rekening.</p>
            <form onSubmit={submitTransfer} className="product-form">
              <label>Dari<select value={transferForm.from_account_id} onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}>
                <option value="">Pilih asal</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Ke<select value={transferForm.to_account_id} onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}>
                <option value="">Pilih tujuan</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Nominal<input type="number" min="0" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} /></label>
              <label>Catatan<input value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving || !transferForm.from_account_id || !transferForm.to_account_id}>Transfer</button>
            </form></details>

            <details className="collapsible"><summary>Ambil Profit / Biaya Bank</summary>
            <p className="hint">Aksi ini mengurangi saldo rekening tanpa mengubah profit transaksi.</p>
            <form onSubmit={submitOwnerDraw} className="product-form compact-form">
              <label>Rekening<select value={ownerDrawForm.account_id} onChange={(e) => setOwnerDrawForm({ ...ownerDrawForm, account_id: e.target.value })}>
                <option value="">Pilih rekening</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Nominal<input type="number" min="0" value={ownerDrawForm.amount} onChange={(e) => setOwnerDrawForm({ ...ownerDrawForm, amount: e.target.value })} /></label>
              <label className="span-2">Catatan<input value={ownerDrawForm.notes} onChange={(e) => setOwnerDrawForm({ ...ownerDrawForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving || !ownerDrawForm.account_id}>Catat Prive Owner</button>
            </form>
            <form onSubmit={submitBankFee} className="product-form compact-form">
              <label>Rekening<select value={bankFeeForm.account_id} onChange={(e) => setBankFeeForm({ ...bankFeeForm, account_id: e.target.value })}>
                <option value="">Pilih rekening</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Nominal<input type="number" min="0" value={bankFeeForm.amount} onChange={(e) => setBankFeeForm({ ...bankFeeForm, amount: e.target.value })} /></label>
              <label className="span-2">Catatan<input value={bankFeeForm.notes} onChange={(e) => setBankFeeForm({ ...bankFeeForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving || !bankFeeForm.account_id}>Catat Biaya Bank/MDR</button>
            </form></details>
          </div>
          <div className="card">
            <h2>Mutasi Saldo Terakhir</h2>
            {accountMutations.length === 0 ? <p>Belum ada mutasi saldo.</p> : accountMutations.map((mutation) => (
              <div key={mutation.id} className="row rich-row">
                <div><strong>{mutation.account_name}</strong><small>{mutation.mutation_type} • {mutation.notes || "-"}</small></div>
                <div className="amount-stack"><strong className={mutation.amount < 0 ? "negative" : "positive"}>{formatRupiah(mutation.amount)}</strong><small>Saldo: {formatRupiah(mutation.balance_after)}</small></div>
              </div>
            ))}
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
              <label>Nominal Utang<input type="number" min="0" value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} /></label>
              <label>Catatan<input value={debtForm.notes} onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving}>Simpan Utang</button>
            </form>
            <h2>Catat Cicilan / Pelunasan</h2>
            <form onSubmit={submitDebtPayment} className="product-form">
              <label>Pelanggan<select value={debtPaymentForm.debt_id} onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, debt_id: e.target.value })}>
                <option value="">Pilih utang</option>
                {openDebts.map((debt) => <option key={debt.id} value={debt.id}>{debt.customer_name} — {formatRupiah(debt.outstanding)}</option>)}
              </select></label>
              <label>Nominal Bayar<input type="number" min="0" value={debtPaymentForm.amount} onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, amount: e.target.value })} /></label>
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
                <div><strong>{mutation.account_name}</strong><small>{mutation.mutation_type} • {mutation.created_at}</small></div>
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
        </section>
      </>
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
    </div>
  );
}
