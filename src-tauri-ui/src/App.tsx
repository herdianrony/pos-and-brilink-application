import { useEffect, useMemo, useState } from "react";
import {
  AccountRow,
  CategoryRow,
  ProductRow,
  PublicUser,
  TransactionRow,
  checkoutPosCash,
  createAdmin,
  createCategory,
  createProduct,
  dbInit,
  healthCheck,
  listAccounts,
  listCategories,
  listProducts,
  listTransactions,
  login,
  setupStatus,
} from "./api";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

type CartItem = { product: ProductRow; quantity: number };

export default function App() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState({ name: "Admin", username: "admin", password: "Admin123" });
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "Admin123" });
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "package", color: "#059669" });
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

  async function refreshData() {
    const [nextAccounts, nextCategories, nextProducts, nextTransactions] = await Promise.all([
      listAccounts(),
      listCategories(),
      listProducts(),
      listTransactions(),
    ]);
    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setProducts(nextProducts);
    setTransactions(nextTransactions);
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
      await createProduct({
        name: productForm.name,
        barcode: productForm.barcode,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        buy_price: Number(productForm.buy_price || 0),
        sell_price: Number(productForm.sell_price || 0),
        stock: Number(productForm.stock || 0),
        min_stock: Number(productForm.min_stock || 0),
        unit: productForm.unit || "pcs",
      });
      setProductForm({ name: "", barcode: "", category_id: "", buy_price: "0", sell_price: "0", stock: "0", min_stock: "5", unit: "pcs" });
      await refreshData();
      setMessage("Produk berhasil ditambahkan");
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

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Eksperimen Tauri Full</p>
          <h1>BRILink POS Lite</h1>
          <p className="subtitle">Frontend static + Rust commands + SQLite lokal. Tanpa Next server.</p>
        </div>
        <button onClick={bootstrap} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
      </section>

      <section className="notice">
        <strong>Status:</strong> {message || "—"}<br />
        <strong>Database:</strong> {dbPath || "—"}
      </section>

      {setupNeeded ? (
        <section className="card">
          <h2>Setup Admin Pertama</h2>
          <form onSubmit={submitSetup} className="form">
            <label>Nama<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
            <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Buat Admin"}</button>
          </form>
        </section>
      ) : !user ? (
        <section className="card">
          <h2>Login</h2>
          <form onSubmit={submitLogin} className="form">
            <label>Username<input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} /></label>
            <label>Password<input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} /></label>
            <button type="submit" disabled={saving}>{saving ? "Memeriksa..." : "Masuk"}</button>
          </form>
        </section>
      ) : (
        <>
          <section className="grid dashboard-grid">
            <div className="card">
              <h2>Dashboard Lite</h2>
              <p>User: <strong>{user.name}</strong> ({user.role})</p>
              <p>Produk aktif: <strong>{products.length}</strong></p>
              <p>Kategori aktif: <strong>{categories.length}</strong></p>
            </div>
            <div className="card">
              <h2>Akun Saldo</h2>
              {accounts.length === 0 ? <p>Belum ada akun.</p> : accounts.map((account) => (
                <div key={account.id} className="row">
                  <span>{account.name}</span>
                  <strong>{formatRupiah(account.balance)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="grid workspace-grid">
            <div className="card">
              <h2>Master Produk</h2>
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
                <button type="submit" disabled={saving}>Tambah Produk</button>
              </form>
              <div className="list">
                {products.length === 0 ? <p>Belum ada produk. Tambahkan produk dulu untuk mencoba POS.</p> : products.map((product) => (
                  <div key={product.id} className="product-row">
                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.category_name || "Tanpa kategori"} • Stok {product.stock} {product.unit}</small>
                    </div>
                    <div className="right">
                      <strong>{formatRupiah(product.sell_price)}</strong>
                      <button onClick={() => addToCart(product)} disabled={product.stock <= 0}>Jual</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card cart-card">
              <h2>POS Tunai</h2>
              {cart.length === 0 ? <p>Keranjang masih kosong.</p> : cart.map((item) => (
                <div key={item.product.id} className="cart-row">
                  <div>
                    <strong>{item.product.name}</strong>
                    <small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small>
                  </div>
                  <input type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(e) => updateCartQty(item.product.id, Number(e.target.value))} />
                  <strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong>
                </div>
              ))}
              <div className="total-row">
                <span>Total</span>
                <strong>{formatRupiah(cartTotal)}</strong>
              </div>
              <button className="checkout" onClick={submitCheckout} disabled={saving || cart.length === 0}>{saving ? "Memproses..." : "Checkout Tunai"}</button>
              <p className="hint">POC ini sudah mengurangi stok, mencatat transaksi POS, mutasi kas, dan menambah saldo Kas Tunai.</p>
            </div>
          </section>

          <section className="card history-card">
            <h2>Riwayat Transaksi Terakhir</h2>
            {transactions.length === 0 ? <p>Belum ada transaksi.</p> : (
              <div className="history-list">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="history-row">
                    <div>
                      <strong>{transaction.invoice_no}</strong>
                      <small>{transaction.transaction_type.toUpperCase()} • {transaction.payment_method.toUpperCase()} • {transaction.status}</small>
                    </div>
                    <div className="right history-amount">
                      <span>{transaction.created_at}</span>
                      <strong>{formatRupiah(transaction.total_amount)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
