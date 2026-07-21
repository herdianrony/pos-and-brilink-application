import { useMemo, useRef, useState } from "react";
import { Search, ScanLine, Pause, Trash2 } from "lucide-react";
import { Button, EmptyState, PageHeader, SectionCard } from "../components/ui";
import type { AccountRow, CategoryRow, ProductRow } from "../api";
import type { CartItem } from "../types";
import { formatRupiah } from "../lib/format";
import { tw } from "../lib/tw";

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
        actions={<><Button variant="secondary" onClick={onHoldCart} disabled={!cart.length}><Pause size={16} /> Hold</Button><Button variant="danger" onClick={onClearCart} disabled={!cart.length}><Trash2 size={16} /> Kosongkan</Button></>}
      />
      <div className={tw("pos-shell electron-pos-shell")}>
        <SectionCard className={tw("pos-catalog electron-pos-catalog")} title="Pilih Produk" description="Cari produk, pilih kategori, lalu tekan Tambah.">
          <div className={tw("pos-search-row")}>
            <label className={tw("pos-search-input")}><Search size={18} /><input className={tw("form-input")} ref={searchRef} value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Cari nama produk atau barcode..." /></label>
            <Button variant="secondary" onClick={() => searchRef.current?.focus()}><ScanLine size={16} /> Scan</Button>
          </div>
          <div className={tw("category-filter-row electron-filter-row")}>
            <button className={tw(posCategoryFilter === "all" ? "filter-chip active" : "filter-chip")} onClick={() => onCategoryFilterChange("all")}>Semua</button>
            {categories.map((category) => (
              <button key={category.id} className={tw(posCategoryFilter === String(category.id) ? "filter-chip active" : "filter-chip")} onClick={() => onCategoryFilterChange(String(category.id))}>{category.name}</button>
            ))}
          </div>
          <div className={tw("pos-product-grid electron-product-grid")}>
            {visibleProducts.length === 0 ? <EmptyState title="Produk tidak ditemukan" description="Tambahkan produk baru atau ubah kata kunci pencarian." /> : visibleProducts.map((product) => (
              <button key={product.id} className={tw("pos-product-card electron-product-card")} onClick={() => onAddToCart(product)} disabled={product.stock <= 0}>
                <div className={tw("product-main")}>
                  <strong>{product.name}</strong>
                  <small>{product.category_name || "Tanpa kategori"} • {product.unit}</small>
                </div>
                <div className={tw("product-meta")}>
                  <strong>{formatRupiah(product.sell_price)}</strong>
                  <span className={tw(product.stock <= product.min_stock ? "stock-badge danger-stock" : "stock-badge")}>Stok {product.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard className={tw("pos-cart-panel electron-cart-panel")} title="Keranjang" description={`${cart.length} item dipilih.`}>
          <div className={tw("cart-list-scroll")}>
            {cart.length === 0 ? <EmptyState title="Keranjang kosong" description="Pilih produk dari katalog." /> : cart.map((item) => (
              <div key={item.product.id} className={tw("cart-row electron-cart-row")}>
                <div><strong>{item.product.name}</strong><small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small></div>
                <input className={tw("form-input")} type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(event) => onUpdateQty(item.product.id, Number(event.target.value))} />
                <strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className={tw("total-row")}><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
          <div className={tw("payment-choice-grid compact-payment-grid")}>
            {(["cash", "transfer", "qris"] as const).map((method) => (
              <button key={method} className={tw(paymentMethod === method ? "choice-card selected" : "choice-card")} onClick={() => onPaymentMethodChange(method)}>
                <strong>{method === "cash" ? "Tunai" : method.toUpperCase()}</strong>
              </button>
            ))}
          </div>
          {paymentMethod !== "cash" && (
            <label className={tw("field-label")}>Rekening Penerima<select className={tw("form-input")} value={settlementAccountId} onChange={(event) => onSettlementAccountChange(event.target.value)}>
              <option value="">Pilih rekening</option>
              {settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
            </select></label>
          )}
          <button className={tw("checkout")} onClick={onSubmitCheckout} disabled={saving || !canPay}>{saving ? "Memproses..." : `Bayar ${paymentMethod === "cash" ? "Tunai" : paymentMethod.toUpperCase()}`}</button>
          <p className={tw("hint")}>Shortcut kasir: pilih produk → cek total → bayar. Struk muncul setelah checkout.</p>
        </SectionCard>
      </div>
    </>
  );
}
