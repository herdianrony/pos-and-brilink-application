import { useMemo, useRef, useState } from "react";
import { Search, ScanLine, Pause, Trash2 } from "lucide-react";
import { PageHeader } from "../components/ui";
import type { AccountRow, CategoryRow, ProductRow } from "../api";
import type { CartItem } from "../types";
import { formatRupiah } from "../lib/format";

export function POSPage({
  categories,
  products,
  cart,
  cartTotal,
  paymentMethod,
  settlementAccountId,
  settlementAccounts,
  saving,
  posCategoryFilter,
  onCategoryFilterChange,
  onAddToCart,
  onUpdateQty,
  onPaymentMethodChange,
  onSettlementAccountChange,
  onHoldCart,
  onClearCart,
  onSubmitCheckout,
}: {
  categories: CategoryRow[];
  products: ProductRow[];
  cart: CartItem[];
  cartTotal: number;
  paymentMethod: "cash" | "transfer" | "qris";
  settlementAccountId: string;
  settlementAccounts: AccountRow[];
  saving: boolean;
  posCategoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onAddToCart: (product: ProductRow) => void;
  onUpdateQty: (productId: number, quantity: number) => void;
  onPaymentMethodChange: (method: "cash" | "transfer" | "qris") => void;
  onSettlementAccountChange: (value: string) => void;
  onHoldCart: () => void;
  onClearCart: () => void;
  onSubmitCheckout: () => void;
}) {
  const [localSearch, setLocalSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const canPay = cart.length > 0 && (paymentMethod === "cash" || Boolean(settlementAccountId));
  const visibleProducts = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.barcode || "", product.category_name || ""].join(" ").toLowerCase().includes(term));
  }, [localSearch, products]);

  return (
    <>
      <PageHeader
        eyebrow="Penjualan Retail"
        title="Kasir POS"
        actions={<><button className="secondary" onClick={onHoldCart} disabled={!cart.length}><Pause size={16} /> Hold</button><button className="danger" onClick={onClearCart} disabled={!cart.length}><Trash2 size={16} /> Kosongkan</button></>}
      />
      <div className="pos-shell electron-pos-shell">
        <section className="pos-catalog card electron-pos-catalog">
          <div className="card-header"><div><h2>Pilih Produk</h2><p>Cari produk, pilih kategori, lalu tekan Tambah.</p></div></div>
          <div className="pos-search-row">
            <label className="pos-search-input"><Search size={18} /><input ref={searchRef} value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Cari nama produk atau barcode..." /></label>
            <button className="secondary" onClick={() => searchRef.current?.focus()}><ScanLine size={16} /> Scan</button>
          </div>
          <div className="category-filter-row electron-filter-row">
            <button className={posCategoryFilter === "all" ? "filter-chip active" : "filter-chip"} onClick={() => onCategoryFilterChange("all")}>Semua</button>
            {categories.map((category) => (
              <button key={category.id} className={posCategoryFilter === String(category.id) ? "filter-chip active" : "filter-chip"} onClick={() => onCategoryFilterChange(String(category.id))}>{category.name}</button>
            ))}
          </div>
          <div className="pos-product-grid electron-product-grid">
            {visibleProducts.length === 0 ? <div className="empty-state"><strong>Produk tidak ditemukan</strong><span>Tambahkan produk baru atau ubah kata kunci pencarian.</span></div> : visibleProducts.map((product) => (
              <button key={product.id} className="pos-product-card electron-product-card" onClick={() => onAddToCart(product)} disabled={product.stock <= 0}>
                <div className="product-main">
                  <strong>{product.name}</strong>
                  <small>{product.category_name || "Tanpa kategori"} • {product.unit}</small>
                </div>
                <div className="product-meta">
                  <strong>{formatRupiah(product.sell_price)}</strong>
                  <span className={product.stock <= product.min_stock ? "stock-badge danger-stock" : "stock-badge"}>Stok {product.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
        <aside className="pos-cart-panel card electron-cart-panel">
          <div className="card-header"><div><h2>Keranjang</h2><p>{cart.length} item dipilih.</p></div></div>
          <div className="cart-list-scroll">
            {cart.length === 0 ? <div className="empty-state"><strong>Keranjang kosong</strong><span>Pilih produk dari katalog.</span></div> : cart.map((item) => (
              <div key={item.product.id} className="cart-row electron-cart-row">
                <div><strong>{item.product.name}</strong><small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small></div>
                <input type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(event) => onUpdateQty(item.product.id, Number(event.target.value))} />
                <strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="total-row"><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
          <div className="payment-choice-grid compact-payment-grid">
            {(["cash", "transfer", "qris"] as const).map((method) => (
              <button key={method} className={paymentMethod === method ? "choice-card selected" : "choice-card"} onClick={() => onPaymentMethodChange(method)}>
                <strong>{method === "cash" ? "Tunai" : method.toUpperCase()}</strong>
              </button>
            ))}
          </div>
          {paymentMethod !== "cash" && (
            <label>Rekening Penerima<select value={settlementAccountId} onChange={(event) => onSettlementAccountChange(event.target.value)}>
              <option value="">Pilih rekening</option>
              {settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
            </select></label>
          )}
          <button className="checkout" onClick={onSubmitCheckout} disabled={saving || !canPay}>{saving ? "Memproses..." : `Bayar ${paymentMethod === "cash" ? "Tunai" : paymentMethod.toUpperCase()}`}</button>
          <p className="hint">Shortcut kasir: pilih produk → cek total → bayar. Struk muncul setelah checkout.</p>
        </aside>
      </div>
    </>
  );
}
