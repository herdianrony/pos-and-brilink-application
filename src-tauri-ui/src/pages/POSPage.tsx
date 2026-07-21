import { useMemo, useRef, useState } from "react";
import { Banknote, CreditCard, Landmark, Plus, QrCode, Search, ScanLine, Pause, Trash2 } from "lucide-react";
import { Button, ChipTabs, EmptyState, PageHeader, SectionCard } from "../components/ui";
import { PaymentModal } from "../components/PaymentModal";
import { ProductImage } from "../components/ProductImage";
import { CurrencyInput } from "../components/CurrencyInput";
import type { AccountRow, CategoryRow, ProductRow } from "../api";
import type { CartItem } from "../types";
import { formatRupiah } from "../lib/format";

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
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5 max-[1120px]:grid-cols-1 grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5 max-[1120px]:grid-cols-1">
        <SectionCard className="min-w-0 rounded-[28px]" title="Pilih Produk" description="Cari produk, pilih kategori, lalu tekan Tambah.">
          <div className="mb-4 flex items-center gap-3 max-[720px]:grid max-[720px]:grid-cols-1">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-0 text-slate-500 [&_svg]:flex-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:shadow-none [&_input]:ring-0 [&_input]:focus:ring-0"><Search size={18} /><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" ref={searchRef} value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Cari nama produk atau barcode..." /></label>
            <Button variant="secondary" onClick={() => searchRef.current?.focus()}><ScanLine size={16} /> Scan</Button>
          </div>
          <ChipTabs
            className="mb-3.5 flex flex-wrap gap-2 mb-3.5 flex flex-wrap gap-2"
            items={[{ id: "all", label: "Semua" }, ...categories.map((category) => ({ id: String(category.id), label: category.name }))]}
            active={posCategoryFilter}
            onChange={onCategoryFilterChange}
            ariaLabel="Filter kategori produk"
          />
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))] grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
            {visibleProducts.length === 0 ? <EmptyState title="Produk tidak ditemukan" description="Tambahkan produk baru atau ubah kata kunci pencarian." /> : visibleProducts.map((product) => (
              <button key={product.id} className="grid min-h-[135px] cursor-pointer gap-3 rounded-[20px] border border-slate-200 bg-white p-3.5 text-left shadow-sm hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onAddToCart(product)} disabled={product.stock <= 0}>
                <div className="flex items-start gap-3">
                  <ProductImage product={product} />
                  <div className="grid min-w-0 gap-1 [&_strong]:truncate [&_small]:text-slate-500">
                    <strong>{product.name}</strong>
                    <small>{product.category_name || "Tanpa kategori"} • {product.unit}</small>
                  </div>
                </div>
                <div className="grid justify-items-end gap-1.5 text-right max-[980px]:justify-items-start max-[980px]:text-left">
                  <strong>{formatRupiah(product.sell_price)}</strong>
                  <span className={product.stock <= product.min_stock ? "inline-flex items-center justify-center rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-700" : "inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700"}>Stok {product.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard className="sticky top-24 max-[1100px]:static rounded-[28px]" title="Keranjang" description={`${cart.length} item dipilih.`}>
          <Button variant="secondary" className="mb-3 w-full" onClick={() => setShowServiceForm(!showServiceForm)}><Landmark size={16} /> Tambah Layanan Agen</Button>
          {showServiceForm && (
            <div className="mb-3 grid grid-cols-2 gap-3 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-3 max-[640px]:grid-cols-1">
              <ChipTabs
                className="flex flex-wrap gap-2 col-span-full md:col-span-2"
                items={posServicePresets.map((preset) => ({ id: preset.label, label: preset.label }))}
                active={serviceForm.service_name}
                onChange={(label) => {
                  const preset = posServicePresets.find((item) => item.label === label);
                  setServiceForm({ ...serviceForm, service_name: label, fee: preset?.fee || serviceForm.fee });
                }}
                ariaLabel="Preset layanan POS"
              />
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Layanan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={serviceForm.service_name} onChange={(event) => setServiceForm({ ...serviceForm, service_name: event.target.value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Nominal<CurrencyInput value={serviceForm.amount} onChange={(value) => setServiceForm({ ...serviceForm, amount: value })} /></label>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Admin<CurrencyInput value={serviceForm.fee} onChange={(value) => setServiceForm({ ...serviceForm, fee: value })} /></label>
              <Button className="col-span-full md:col-span-2" onClick={() => { onAddAgentService({ service_name: serviceForm.service_name, customer_name: serviceForm.customer_name, amount: Number(serviceForm.amount || 0), fee: Number(serviceForm.fee || 0), provider_cost: 0, account_id: null, cash_effect: 0, bank_effect: 0, notes: serviceForm.notes }); setShowServiceForm(false); }}><Plus size={16} /> Masukkan ke Keranjang</Button>
            </div>
          )}
          <div className="max-h-[48vh] overflow-auto pr-1">
            {cart.length === 0 ? <EmptyState title="Keranjang kosong" description="Pilih produk dari katalog atau tambah layanan agen." /> : cart.map((item) => (
              <div key={item.type === "product" ? `product-${item.product.id}` : item.id} className="grid grid-cols-[1fr_86px_auto] items-center gap-3 border-b border-slate-100 py-3 max-[640px]:grid-cols-1 [&_input]:p-2.5 [&_input]:text-center [&_small]:mt-1 [&_small]:block [&_small]:text-slate-500 grid-cols-[minmax(0,1fr)_72px_auto] max-[640px]:grid-cols-1">
                {item.type === "product" ? (
                  <><div><strong>{item.product.name}</strong><small>{formatRupiah(item.product.sell_price)} / {item.product.unit}</small></div><input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(event) => onUpdateQty(item.product.id, Number(event.target.value))} /><strong>{formatRupiah(item.product.sell_price * item.quantity)}</strong></>
                ) : (
                  <><div><strong>{item.service_name}</strong><small>Layanan agen • admin {formatRupiah(item.fee)}</small></div><span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">Jasa</span><strong>{formatRupiah(item.amount + item.fee)}</strong></>
                )}
              </div>
            ))}
          </div>
          <div className="my-4.5 flex items-center justify-between gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-lg text-emerald-800"><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
          <div className="mb-3.5 grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1 grid-cols-3 max-[640px]:grid-cols-1 [&_.choice-card]:min-h-[58px] [&_.choice-card]:justify-items-center [&_.choice-card]:text-center">
            {(["cash", "transfer", "qris"] as const).map((method) => {
              const MethodIcon = method === "cash" ? Banknote : method === "transfer" ? CreditCard : QrCode;
              return (
                <button key={method} className={paymentMethod === method ? "grid min-h-[88px] content-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 shadow-none [&_span]:text-xs [&_span]:font-bold [&_span]:text-slate-500 border-emerald-400 bg-emerald-50 text-emerald-800" : "grid min-h-[88px] content-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 shadow-none [&_span]:text-xs [&_span]:font-bold [&_span]:text-slate-500"} onClick={() => onPaymentMethodChange(method)}>
                  <MethodIcon size={18} />
                  <strong>{method === "cash" ? "Tunai" : method.toUpperCase()}</strong>
                </button>
              );
            })}
          </div>
          <button className="w-full text-base" onClick={() => setShowPaymentModal(true)} disabled={saving || !canPay}>{saving ? "Memproses..." : "Bayar"}</button>
          <p className="mb-0 text-[13px] text-slate-500">Shortcut pembayaran tersedia di modal: F2 Tunai, F3 Transfer, F4 QRIS, Enter Simpan.</p>
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
