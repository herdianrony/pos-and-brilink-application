import { useMemo, useRef, useState } from "react";
import { Banknote, CreditCard, Landmark, Plus, QrCode, Search, ScanLine, Pause, Trash2 } from "lucide-react";
import { Button, EmptyState, PageHeader, SectionCard } from "../components/ui";
import { PaymentModal } from "../components/PaymentModal";
import { CurrencyInput } from "../components/CurrencyInput";
import type { AccountRow, CategoryRow, ProductRow } from "../api";
import type { CartItem } from "../types";
import { formatRupiah } from "../lib/format";
import { tw } from "../lib/tw";

const posServicePresets = [
  { label: "Tarik Tunai", fee: "5000" },
  { label: "Setor Tunai", fee: "5000" },
  { label: "Transfer", fee: "5000" },
  { label: "Payment/Topup", fee: "2500" },
];

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
  onAddAgentService,
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
  onAddAgentService: (service: { service_name: string; customer_name?: string; amount: number; fee: number; provider_cost: number; account_id?: number | null; cash_effect: number; bank_effect: number; notes?: string }) => void;
  onUpdateQty: (productId: number, quantity: number) => void;
  onPaymentMethodChange: (method: "cash" | "transfer" | "qris") => void;
  onSettlementAccountChange: (value: string) => void;
  onHoldCart: () => void;
  onClearCart: () => void;
  onSubmitCheckout: (cashReceived?: number) => void;
}) {
  const [localSearch, setLocalSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({ service_name: "Transfer", customer_name: "", amount: "0", fee: "5000", provider_cost: "0", account_id: "", cash_effect: "0", bank_effect: "0", notes: "" });
  const searchRef = useRef<HTMLInputElement>(null);
  const canPay = cart.length > 0;
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
          <Button variant="secondary" className={tw("mb-3 w-full")} onClick={() => setShowServiceForm(!showServiceForm)}><Landmark size={16} /> Tambah Layanan Agen</Button>
          {showServiceForm && (
            <div className={tw("pos-service-form")}>
              <div className={tw("service-preset-row span-2")}>
                {posServicePresets.map((preset) => <button key={preset.label} type="button" className={tw(serviceForm.service_name === preset.label ? "filter-chip active" : "filter-chip")} onClick={() => setServiceForm({ ...serviceForm, service_name: preset.label, fee: preset.fee })}>{preset.label}</button>)}
              </div>
              <label className={tw("field-label")}>Layanan<input className={tw("form-input")} value={serviceForm.service_name} onChange={(event) => setServiceForm({ ...serviceForm, service_name: event.target.value })} /></label>
              <label className={tw("field-label")}>Nominal<CurrencyInput value={serviceForm.amount} onChange={(value) => setServiceForm({ ...serviceForm, amount: value })} /></label>
              <label className={tw("field-label")}>Admin<CurrencyInput value={serviceForm.fee} onChange={(value) => setServiceForm({ ...serviceForm, fee: value })} /></label>
              <Button className={tw("span-2")} onClick={() => { onAddAgentService({ service_name: serviceForm.service_name, customer_name: serviceForm.customer_name, amount: Number(serviceForm.amount || 0), fee: Number(serviceForm.fee || 0), provider_cost: 0, account_id: null, cash_effect: 0, bank_effect: 0, notes: serviceForm.notes }); setShowServiceForm(false); }}><Plus size={16} /> Masukkan ke Keranjang</Button>
            </div>
          )}
          <div className={tw("cart-list-scroll")}>
            {cart.length === 0 ? <EmptyState title="Keranjang kosong" description="Pilih produk dari katalog atau tambah layanan agen." /> : cart.map((item) => (
              <div key={item.type === "product" ? `product-${item.product.id}` : item.id} className={tw("cart-row electron-cart-row")}>
                {item.type === "product" ? (
                  <><div><strong>{item.product.name}</strong><small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small></div><input className={tw("form-input")} type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(event) => onUpdateQty(item.product.id, Number(event.target.value))} /><strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong></>
                ) : (
                  <><div><strong>{item.service_name}</strong><small>Layanan agen • admin {formatRupiah(item.fee)}</small></div><span className={tw("status-badge")}>Jasa</span><strong>{formatRupiah(item.amount + item.fee)}</strong></>
                )}
              </div>
            ))}
          </div>
          <div className={tw("total-row")}><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
          <div className={tw("payment-choice-grid compact-payment-grid")}>
            {(["cash", "transfer", "qris"] as const).map((method) => {
              const MethodIcon = method === "cash" ? Banknote : method === "transfer" ? CreditCard : QrCode;
              return (
                <button key={method} className={tw(paymentMethod === method ? "choice-card selected" : "choice-card")} onClick={() => onPaymentMethodChange(method)}>
                  <MethodIcon size={18} />
                  <strong>{method === "cash" ? "Tunai" : method.toUpperCase()}</strong>
                </button>
              );
            })}
          </div>
          <button className={tw("checkout")} onClick={() => setShowPaymentModal(true)} disabled={saving || !canPay}>{saving ? "Memproses..." : "Bayar"}</button>
          <p className={tw("hint")}>Shortcut pembayaran tersedia di modal: F2 Tunai, F3 Transfer, F4 QRIS, Enter Simpan.</p>
          <PaymentModal
            open={showPaymentModal}
            total={cartTotal}
            itemCount={cart.length}
            paymentMethod={paymentMethod}
            settlementAccountId={settlementAccountId}
            settlementAccounts={settlementAccounts}
            saving={saving}
            onPaymentMethodChange={onPaymentMethodChange}
            onSettlementAccountChange={onSettlementAccountChange}
            onClose={() => setShowPaymentModal(false)}
            onConfirm={(cashReceived) => {
              setShowPaymentModal(false);
              onSubmitCheckout(cashReceived);
            }}
          />
        </SectionCard>
      </div>
    </>
  );
}
