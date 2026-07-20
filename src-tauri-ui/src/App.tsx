import { useEffect, useMemo, useState } from "react";
import {
  AccountMutationRow,
  AccountRow,
  CategoryRow,
  ProductRow,
  PublicUser,
  TransactionItemRow,
  TransactionRow,
  adjustAccountBalance,
  bankFee,
  checkoutPosCash,
  createAccount,
  createAdmin,
  createAgentTransaction,
  createCategory,
  createProduct,
  deactivateProduct,
  dbInit,
  healthCheck,
  listAccountMutations,
  listAccounts,
  listCategories,
  listProducts,
  listTransactionItems,
  listTransactions,
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
type ViewKey = "dashboard" | "pos" | "brilink" | "products" | "history" | "rekeningKoran" | "cash" | "reports" | "settings";
type IconName = "dashboard" | "pos" | "brilink" | "products" | "history" | "rekeningKoran" | "cash" | "reports" | "settings" | "search";

const navItems: Array<{ id: ViewKey; label: string; icon: IconName; adminOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "pos", label: "Kasir POS", icon: "pos" },
  { id: "brilink", label: "Layanan Agen", icon: "brilink" },
  { id: "products", label: "Produk", icon: "products", adminOnly: true },
  { id: "history", label: "Transaksi", icon: "history" },
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
  if (name === "cash") return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9v.01" /><path d="M18 15v.01" /></svg>;
  if (name === "settings") return <svg {...common}><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 3.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.15.4.38.74.7 1 .32.25.7.4 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6Z" /></svg>;
  return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountMutations, setAccountMutations] = useState<AccountMutationRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<TransactionItemRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "Admin", username: "admin", password: "Admin123" });
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "Admin123" });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris">("cash");
  const [settlementAccountId, setSettlementAccountId] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "package", color: "#059669" });
  const [accountForm, setAccountForm] = useState({ code: "bri", name: "Rekening BRI", initial_balance: "0", min_balance: "0" });
  const [adjustForm, setAdjustForm] = useState({ account_id: "", amount: "0", notes: "Penyesuaian saldo" });
  const [transferForm, setTransferForm] = useState({ from_account_id: "", to_account_id: "", amount: "0", notes: "Transfer antar rekening" });
  const [ownerDrawForm, setOwnerDrawForm] = useState({ account_id: "", amount: "0", notes: "Prive Owner" });
  const [bankFeeForm, setBankFeeForm] = useState({ account_id: "", amount: "0", notes: "Biaya Bank / MDR" });
  const [agentForm, setAgentForm] = useState({ service_name: "Tarik Tunai", customer_name: "", amount: "0", fee: "5000", account_id: "", cash_effect: "0", bank_effect: "0", notes: "" });
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
  const isAdmin = user?.role === "admin";

  async function refreshData() {
    const [nextAccounts, nextMutations, nextCategories, nextProducts, nextTransactions] = await Promise.all([
      listAccounts(),
      listAccountMutations(),
      listCategories(),
      listProducts(),
      listTransactions(),
    ]);
    setAccounts(nextAccounts);
    setAccountMutations(nextMutations);
    setCategories(nextCategories);
    setProducts(nextProducts);
    setTransactions(nextTransactions);
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
      await refreshData();
      setMessage("Transaksi layanan agen berhasil dicatat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  function authShell(kind: "setup" | "login") {
    const isSetup = kind === "setup";
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">BP</div>
          <p className="eyebrow">BRILink POS Lite</p>
          <h1>{isSetup ? "Setup Admin Pertama" : "Masuk ke Aplikasi"}</h1>
          <p className="muted">Tauri Full POC — database lokal, tanpa Next server.</p>
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
        <div className="page-title">
          <div>
            <p className="eyebrow">Ringkasan Bisnis</p>
            <h1>Dashboard</h1>
          </div>
          <button onClick={bootstrap} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
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
            {transactions.length === 0 ? <p>Belum ada transaksi.</p> : transactions.slice(0, 5).map((transaction) => (
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
    return (
      <div className="list">
        {products.length === 0 ? <p>Belum ada produk. Tambahkan produk dulu untuk mencoba POS.</p> : products.map((product) => (
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
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Penjualan</p><h1>POS Tunai</h1></div></div>
        <section className="grid workspace-grid">
          <div className="card"><h2>Pilih Produk</h2>{productList(true)}</div>
          <div className="card cart-card">
            <h2>Keranjang</h2>
            {cart.length === 0 ? <p>Keranjang masih kosong.</p> : cart.map((item) => (
              <div key={item.product.id} className="cart-row">
                <div><strong>{item.product.name}</strong><small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small></div>
                <input type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(e) => updateCartQty(item.product.id, Number(e.target.value))} />
                <strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong>
              </div>
            ))}
            <div className="payment-box">
              <label>Metode Pembayaran<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "cash" | "transfer" | "qris")}>
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select></label>
              {paymentMethod !== "cash" && (
                <label>Rekening Penerima<select value={settlementAccountId} onChange={(e) => setSettlementAccountId(e.target.value)}>
                  <option value="">Pilih rekening</option>
                  {settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
                </select></label>
              )}
            </div>
            <div className="total-row"><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
            <button className="checkout" onClick={submitCheckout} disabled={saving || cart.length === 0 || (paymentMethod !== "cash" && !settlementAccountId)}>{saving ? "Memproses..." : `Bayar ${paymentMethod === "cash" ? "Tunai" : paymentMethod.toUpperCase()}`}</button>
            <p className="hint">Checkout sudah mengurangi stok, mencatat transaksi POS, dan membuat mutasi saldo sesuai metode pembayaran.</p>
          </div>
        </section>
      </>
    );
  }


  function renderBrilink() {
    const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Layanan Agen</p><h1>Transaksi Agen</h1></div></div>
        <section className="grid workspace-grid">
          <div className="card">
            <h2>Preset Layanan</h2>
            <div className="quick-actions">
              <button type="button" className="secondary" onClick={() => applyAgentPreset("withdraw")}>Tarik Tunai</button>
              <button type="button" className="secondary" onClick={() => applyAgentPreset("deposit")}>Setor Tunai</button>
              <button type="button" className="secondary" onClick={() => applyAgentPreset("transfer")}>Transfer</button>
              <button type="button" className="secondary" onClick={() => applyAgentPreset("payment")}>Payment/Topup</button>
            </div>
            <form onSubmit={submitAgentTransaction} className="product-form">
              <label>Layanan<input value={agentForm.service_name} onChange={(e) => setAgentForm({ ...agentForm, service_name: e.target.value })} /></label>
              <label>Nama Pelanggan<input value={agentForm.customer_name} onChange={(e) => setAgentForm({ ...agentForm, customer_name: e.target.value })} /></label>
              <label>Nominal Transaksi<input type="number" min="0" value={agentForm.amount} onChange={(e) => setAgentForm({ ...agentForm, amount: e.target.value })} /></label>
              <label>Admin/Fee<input type="number" min="0" value={agentForm.fee} onChange={(e) => setAgentForm({ ...agentForm, fee: e.target.value })} /></label>
              <label>Rekening Layanan<select value={agentForm.account_id} onChange={(e) => setAgentForm({ ...agentForm, account_id: e.target.value })}>
                <option value="">Tidak ada efek rekening</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Efek Rekening (+/-)<input type="number" value={agentForm.bank_effect} onChange={(e) => setAgentForm({ ...agentForm, bank_effect: e.target.value })} /></label>
              <label>Efek Kas Tunai (+/-)<input type="number" value={agentForm.cash_effect} onChange={(e) => setAgentForm({ ...agentForm, cash_effect: e.target.value })} /></label>
              <label>Catatan<input value={agentForm.notes} onChange={(e) => setAgentForm({ ...agentForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving}>Simpan Transaksi Agen</button>
            </form>
            <p className="hint">Mode ini fleksibel: isi efek kas/rekening sesuai alur operasional outlet. Positif menambah saldo, negatif mengurangi saldo.</p>
          </div>
          <div className="card">
            <h2>Riwayat Layanan Agen</h2>
            {agentTransactions.length === 0 ? <p>Belum ada transaksi agen.</p> : agentTransactions.map((transaction) => (
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
        <section className="grid workspace-grid">
          <div className="card history-card">
            <h2>Daftar Transaksi</h2>
            {transactions.length === 0 ? <p>Belum ada transaksi.</p> : (
              <div className="history-list">
                {transactions.map((transaction) => (
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
        <div className="page-title"><div><p className="eyebrow">Keuangan</p><h1>Kas & Saldo</h1></div></div>
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
            <h2>Tambah Rekening Non-Tunai</h2>
            <form onSubmit={submitAccount} className="product-form">
              <label>Kode<input value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="bri / bca / qris" /></label>
              <label>Nama<input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Rekening BRI" /></label>
              <label>Saldo Awal<input type="number" min="0" value={accountForm.initial_balance} onChange={(e) => setAccountForm({ ...accountForm, initial_balance: e.target.value })} /></label>
              <label>Saldo Minimum<input type="number" min="0" value={accountForm.min_balance} onChange={(e) => setAccountForm({ ...accountForm, min_balance: e.target.value })} /></label>
              <button type="submit" disabled={saving}>Tambah Rekening</button>
            </form>
            <h2>Sesuaikan Saldo</h2>
            <form onSubmit={submitAdjustment} className="product-form">
              <label>Rekening<select value={adjustForm.account_id} onChange={(e) => setAdjustForm({ ...adjustForm, account_id: e.target.value })}>
                <option value="">Pilih rekening</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Nominal (+ / -)<input type="number" value={adjustForm.amount} onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })} /></label>
              <label className="span-2">Catatan<input value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} /></label>
              <button type="submit" disabled={saving || !adjustForm.account_id}>Simpan Penyesuaian</button>
            </form>

            <h2>Transfer Antar Rekening</h2>
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
            </form>

            <h2>Ambil Profit / Biaya Bank</h2>
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
            </form>
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


  function renderRekeningKoran() {
    return (
      <>
        <div className="page-title"><div><p className="eyebrow">Mutasi</p><h1>Rekening Koran</h1></div></div>
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
        <div className="page-title"><div><p className="eyebrow">Analitik</p><h1>Laporan</h1></div></div>
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
        <section className="card">
          <h2>Status Eksperimen</h2>
          <p>Ini masih Tauri Full POC. UI sudah dibuat lebih mendekati layout Electron, tetapi fitur belum parity penuh.</p>
          <div className="db-box"><strong>Database lokal</strong><span>{dbPath || "—"}</span></div>
        </section>
      </>
    );
  }

  function renderActiveView() {
    if (activeView === "pos") return renderPos();
    if (activeView === "brilink") return renderBrilink();
    if (activeView === "products") return renderProducts();
    if (activeView === "history") return renderHistory();
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
        <div className="logo-row"><div className="brand-mark small">BP</div><div><strong>BRILink POS</strong><small>Lite / Tauri</small></div></div>
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
          <div className="search-box"><Icon name="search" /> <span>Cari produk / transaksi — segera</span></div>
          <div className="topbar-actions"><span>{message || "Siap"}</span><button onClick={bootstrap} disabled={loading}>Refresh</button></div>
        </header>
        <main className="page-content">{renderActiveView()}</main>
      </section>
    </div>
  );
}
