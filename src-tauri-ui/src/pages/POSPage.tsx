import { useMemo, useState } from "react";
import {
  CreditCard,
  Minus,
  Pause,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Badge, Button, EmptyState } from "../components/ui";
import { PaymentModal } from "../components/PaymentModal";
import { ProductImage } from "../components/ProductImage";
import { formatRupiah } from "../lib/format";
import { cn } from "../lib/cn";
import type { AccountRow, CategoryRow, ProductRow } from "../api";
import type { CartItem } from "../types";

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
  onAddAgentService: (service: {
    service_name: string;
    customer_name?: string;
    amount: number;
    fee: number;
    provider_cost: number;
    account_id?: number | null;
    cash_effect: number;
    bank_effect: number;
    notes?: string;
  }) => void;
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
  const [serviceForm, setServiceForm] = useState({
    service_name: "Transfer",
    customer_name: "",
    amount: "0",
    fee: "5000",
    provider_cost: "0",
    account_id: "",
    cash_effect: "0",
    bank_effect: "0",
    notes: "",
  });
  const canPay = cart.length > 0;

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const visibleProducts = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.barcode || "", product.category_name || ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [localSearch, products]);

  // Build a quick lookup for in-cart items
  const cartByProduct = useMemo(() => {
    const map = new Map<number, CartItem>();
    for (const item of cart) {
      if (item.type === "product") map.set(item.product.id, item);
    }
    return map;
  }, [cart]);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-2rem)] animate-fadeIn">
        {/* ── Left: Products ───────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Kasir POS
              </h2>
              <p className="text-sm text-slate-400">
                Pilih produk untuk ditambahkan
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari produk atau scan barcode..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-soft"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => onCategoryFilterChange("all")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                posCategoryFilter === "all"
                  ? "bg-primary text-white shadow-card shadow-primary/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-primary/30",
              )}
            >
              Semua
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onCategoryFilterChange(String(c.id))}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  posCategoryFilter === String(c.id)
                    ? "bg-primary text-white shadow-card shadow-primary/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-primary/30",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {products.length === 0 ? (
              <EmptyState title="Produk tidak ditemukan" />
            ) : visibleProducts.length === 0 ? (
              <EmptyState title="Produk tidak ditemukan" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {visibleProducts.map((product) => {
                  const inCart = cartByProduct.get(product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => onAddToCart(product)}
                      disabled={product.stock <= 0}
                      className={cn(
                        "p-3.5 rounded-2xl text-left transition-all duration-200 border-2 group relative overflow-hidden",
                        inCart
                          ? "bg-primary/5 border-primary shadow-card shadow-primary/10"
                          : "bg-white border-transparent hover:border-slate-200 hover:shadow-pop",
                        product.stock <= 0 && "opacity-40 cursor-not-allowed",
                      )}
                    >
                      {inCart && (
                        <div className="absolute top-2 right-2 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-pop">
                          {inCart.quantity}
                        </div>
                      )}
                      <div className="mb-2">
                        <ProductImage product={product} />
                      </div>
                      <p className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-primary font-bold text-base">
                        {formatRupiah(product.sell_price)}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span
                          className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full",
                            product.stock <= (product.min_stock ?? 5)
                              ? "bg-red-100 text-red-600"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {product.stock} {product.unit}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart ──────────────────────────── */}
        <div
          className={cn(
            "bg-white border border-slate-100 flex flex-col transition-all duration-300",
            "lg:w-[380px] lg:rounded-2xl lg:shadow-pop lg:relative lg:h-full",
            "fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl shadow-float max-h-[60vh] lg:max-h-none",
          )}
        >
          {/* Cart header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag size={18} className="text-primary" />
              Keranjang
            </h3>
            {totalItems > 0 && (
              <Badge variant="primary">{totalItems} item</Badge>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 max-h-[35vh] lg:max-h-none">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                <ShoppingBag size={48} strokeWidth={1} />
                <p className="text-sm mt-3 text-slate-400">
                  Keranjang masih kosong
                </p>
                <p className="text-xs text-gray-300">
                  Klik produk untuk menambahkan
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const key =
                  item.type === "product"
                    ? `product-${item.product.id}`
                    : item.id;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group animate-fadeIn"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">
                        {item.type === "product"
                          ? item.product.name
                          : item.service_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.type === "product"
                          ? `${formatRupiah(item.product.sell_price)} / ${item.product.unit}`
                          : `Layanan agen • admin ${formatRupiah(item.fee)}`}
                      </p>
                    </div>

                    {item.type === "product" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            onUpdateQty(item.product.id, item.quantity - 1)
                          }
                          className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-slate-700">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQty(item.product.id, item.quantity + 1)
                          }
                          className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">
                        Jasa
                      </span>
                    )}

                    <p className="text-sm font-bold text-primary w-20 text-right">
                      {item.type === "product"
                        ? formatRupiah(item.product.sell_price * item.quantity)
                        : formatRupiah(item.amount + item.fee)}
                    </p>

                    {item.type === "product" && (
                      <button
                        onClick={() => onUpdateQty(item.product.id, 0)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Total & Actions */}
          <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">
                Total Pembayaran
              </span>
              <span className="text-2xl font-extrabold text-primary">
                {formatRupiah(cartTotal)}
              </span>
            </div>

            {/* Agent service toggle */}
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => setShowServiceForm(!showServiceForm)}
            >
              <Plus size={16} /> Tambah Layanan Agen
            </Button>

            {showServiceForm && (
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="col-span-2 flex flex-wrap gap-2">
                  {posServicePresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() =>
                        setServiceForm({
                          ...serviceForm,
                          service_name: preset.label,
                          fee: preset.fee,
                        })
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                        serviceForm.service_name === preset.label
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-600 border border-slate-200",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">
                  Layanan
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={serviceForm.service_name}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        service_name: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">
                  Nominal
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={serviceForm.amount}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        amount: e.target.value.replace(/\D/g, ""),
                      })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">
                  Admin
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={serviceForm.fee}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        fee: e.target.value.replace(/\D/g, ""),
                      })
                    }
                  />
                </label>
                <div className="col-span-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      onAddAgentService({
                        service_name: serviceForm.service_name,
                        customer_name: serviceForm.customer_name,
                        amount: Number(serviceForm.amount || 0),
                        fee: Number(serviceForm.fee || 0),
                        provider_cost: 0,
                        account_id: null,
                        cash_effect: 0,
                        bank_effect: 0,
                        notes: serviceForm.notes,
                      });
                      setShowServiceForm(false);
                    }}
                  >
                    <Plus size={16} /> Masukkan ke Keranjang
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons row */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={onHoldCart}
                disabled={!cart.length}
              >
                <Pause size={16} /> Hold
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={onClearCart}
                disabled={!cart.length}
              >
                <Trash2 size={16} /> Kosongkan
              </Button>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canPay || saving}
              onClick={() => setShowPaymentModal(true)}
            >
              <CreditCard size={18} />{" "}
              {saving ? "Memproses..." : "Bayar Sekarang"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────── */}
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
    </>
  );
}