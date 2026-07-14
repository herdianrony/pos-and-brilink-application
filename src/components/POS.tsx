"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Badge, Spinner, EmptyState, Card, useToast } from "@/components/ui";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ReceiptPreview, type ReceiptData } from "@/components/ReceiptPreview";
import { useBarcodeScanner } from "@/lib/hardware/use-barcode-scanner";
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingBag, CheckCircle, X, Pause, Play, Tag, ScanLine, Printer } from "lucide-react";

interface Product {
  id: number; name: string; barcode: string | null;
  categoryId: number | null; categoryName: string | null; categoryIcon: string | null;
  buyPrice: string; sellPrice: string; stock: number; unit: string | null;
}
interface CartItem {
  productId: number; productName: string; unitPrice: string; buyPrice: string;
  quantity: number; subtotal: string; stock: number; unit: string | null;
}
interface Category { id: number; name: string; icon: string | null; }
interface HeldCart { id: string; cart: CartItem[]; customerName: string; timestamp: number; }

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [cashAmt, setCashAmt] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [lastInv, setLastInv] = useState("");
  const [lastTrxData, setLastTrxData] = useState<ReceiptData | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // ── New features ─────────────────────────────
  // P1-2: Persist held carts to localStorage
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    try {
      const stored = localStorage.getItem("pos_held_carts");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // P1-2: Save held carts to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("pos_held_carts", JSON.stringify(heldCarts));
    } catch {}
  }, [heldCarts]);
  const [showHeld, setShowHeld] = useState(false);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "rupiah">("none");
  const [discountValue, setDiscountValue] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const toast = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (catFilter !== "all") p.set("categoryId", catFilter);
    const res = await fetch(`/api/products?${p}`);
    setProducts(await res.json());
    setLoading(false);
  }, [search, catFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetch("/api/categories").then(r => r.json()).then(setCategories); }, []);

  // ── Barcode Scanner Integration ───────────────
  // Scan barcode → search product by barcode → add to cart
  useBarcodeScanner({
    onScan: async (code) => {
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 300);
      // Cari produk by barcode
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(code)}`);
        const data = await res.json();
        const found = data.find((p: Product) => p.barcode === code);
        if (found) {
          addToCart(found);
          toast.success(`${found.name} ditambahkan ke keranjang`);
        } else {
          toast.warning(`Barcode "${code}" tidak ditemukan`);
        }
      } catch {
        toast.error("Gagal mencari produk");
      }
    },
    enabled: !showPay && !showDone, // disable saat modal terbuka
  });

  // ── Keyboard Shortcuts ────────────────────────
  // F1 = Bayar (open payment modal)
  // F2 = Hold cart
  // ESC = Clear cart / close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip jika sedang mengetik di input field
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA") && e.key !== "F1" && e.key !== "F2") return;

      if (e.key === "F1") {
        e.preventDefault();
        if (cart.length > 0 && !showPay && !showDone) {
          setShowPay(true);
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0 && !showPay && !showDone) {
          holdCart();
        }
      } else if (e.key === "Escape") {
        if (showPay) setShowPay(false);
        else if (showDone) setShowDone(false);
        else if (showHeld) setShowHeld(false);
        else if (showDiscount) setShowDiscount(false);
        else if (cart.length > 0) {
          if (confirm("Kosongkan keranjang?")) {
            setCart([]);
            setCustomerName("");
            toast.info("Keranjang dikosongkan");
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, showPay, showDone, showHeld, showDiscount]);

  // ── Hold Cart ─────────────────────────────────
  function holdCart() {
    if (cart.length === 0) return;
    const held: HeldCart = {
      id: Date.now().toString(),
      cart: [...cart],
      customerName,
      timestamp: Date.now(),
    };
    setHeldCarts(prev => [...prev, held]);
    setCart([]);
    setCustomerName("");
    toast.success("Transaksi ditahan (Hold)");
  }

  // ── Resume Held Cart ───────────────────────────
  function resumeCart(held: HeldCart) {
    if (cart.length > 0) {
      if (!confirm("Keranjang saat ini akan diganti. Lanjutkan?")) return;
    }
    setCart(held.cart);
    setCustomerName(held.customerName);
    setHeldCarts(prev => prev.filter(h => h.id !== held.id));
    setShowHeld(false);
    toast.info("Transaksi dilanjutkan");
  }

  // ── Discount Calculation ───────────────────────
  // total & discountAmount calculated below after cart totals

  function addToCart(p: Product) {
    setCart(prev => {
      const ex = prev.find(c => c.productId === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) return prev;
        return prev.map(c => c.productId === p.id
          ? { ...c, quantity: c.quantity + 1, subtotal: ((c.quantity + 1) * parseFloat(c.unitPrice)).toString() }
          : c);
      }
      if (p.stock <= 0) return prev;
      return [...prev, {
        productId: p.id, productName: p.name, unitPrice: p.sellPrice,
        buyPrice: p.buyPrice, quantity: 1, subtotal: p.sellPrice, stock: p.stock, unit: p.unit,
      }];
    });
  }

  function updateQty(id: number, d: number) {
    setCart(prev => prev.map(c => {
      if (c.productId !== id) return c;
      const q = c.quantity + d;
      if (q <= 0 || q > c.stock) return c;
      return { ...c, quantity: q, subtotal: (q * parseFloat(c.unitPrice)).toString() };
    }));
  }

  const total = cart.reduce((s, c) => s + parseFloat(c.subtotal), 0);
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const discountAmount = (() => {
    if (discountType === "none" || !discountValue) return 0;
    const val = parseFloat(discountValue) || 0;
    if (discountType === "percent") {
      // P0-2: Cap percent at 100%
      const cappedVal = Math.min(val, 100);
      return (total * cappedVal) / 100;
    }
    // P0-2: Cap rupiah discount at total
    return Math.min(val, total);
  })();
  const grandTotal = total - discountAmount;
  const change = parseFloat(cashAmt || "0") - grandTotal;

  async function doCheckout() {
    if (!cart.length) return;
    // P0-2: Validate cash amount vs grandTotal (not total)
    if (payMethod === "cash" && parseFloat(cashAmt || "0") < grandTotal) {
      toast.error("Uang tunai kurang dari total pembayaran");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pos", items: cart, totalAmount: grandTotal, customerName: customerName || null, paymentMethod: payMethod, discount: discountAmount }),
      });
      const trx = await res.json();
      // P0-1: Check res.ok before showing success
      if (!res.ok) {
        toast.error(trx.error || "Transaksi gagal diproses");
        return; // Don't close modal, don't clear cart
      }
      setLastInv(trx.invoiceNo);
      // Preserve transaction data for print preview (before clearing cart)
      setLastTrxData({
        store: { name: "POS & Agen Bisnis" }, // TODO: load from settings
        invoice: {
          no: trx.invoiceNo,
          date: new Date().toLocaleString("id-ID"),
          type: "POS",
          cashier: "Admin",
          customer: customerName || undefined,
        },
        items: cart.map(c => ({
          name: c.productName,
          qty: c.quantity,
          price: parseFloat(c.unitPrice),
          subtotal: parseFloat(c.subtotal),
        })),
        summary: {
          subtotal: total,
          discount: discountAmount,
          total: grandTotal,
          paymentMethod: payMethod,
          paid: payMethod === "cash" ? parseFloat(cashAmt || "0") : grandTotal,
          change: payMethod === "cash" ? change : 0,
        },
      });
      setShowPay(false);
      setShowDone(true);
      setCart([]);
      setCustomerName("");
      setCashAmt("");
      setDiscountType("none");
      setDiscountValue("");
      fetchProducts();
      toast.success("Transaksi berhasil!");
    } catch { toast.error("Gagal memproses transaksi"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-2rem)] animate-fadeIn">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Kasir POS</h2>
            <p className="text-sm text-slate-400">Pilih produk untuk ditambahkan</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari produk atau scan barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-soft"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCatFilter("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              catFilter === "all" ? "bg-primary text-white shadow-card shadow-primary/20" : "bg-white text-slate-600 border border-slate-200 hover:border-primary/30"
            )}
          >Semua</button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(c.id.toString())}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                catFilter === c.id.toString() ? "bg-primary text-white shadow-card shadow-primary/20" : "bg-white text-slate-600 border border-slate-200 hover:border-primary/30"
              )}
            ><DynamicIcon name={c.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />{c.name}</button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? <Spinner /> : products.length === 0 ? (
            <EmptyState icon="search" title="Produk tidak ditemukan" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {products.map(p => {
                const inCart = cart.find(c => c.productId === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className={cn(
                      "p-3.5 rounded-2xl text-left transition-all duration-200 border-2 group relative overflow-hidden",
                      inCart ? "bg-primary/5 border-primary shadow-card shadow-primary/10" : "bg-white border-transparent hover:border-slate-200 hover:shadow-pop",
                      p.stock <= 0 && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-pop">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                      <DynamicIcon name={p.categoryIcon} fallback="package" size={20} className="text-primary" />
                    </div>
                    <p className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-primary font-bold text-base">{formatRupiah(p.sellPrice)}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full",
                        p.stock <= 5 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {p.stock} {p.unit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart — Sprint 2: Mobile bottom sheet */}
      <div className={cn(
        "bg-white border border-slate-100 flex flex-col transition-all duration-300",
        "lg:w-[380px] lg:rounded-2xl lg:shadow-pop lg:relative lg:h-full",
        // Mobile: bottom sheet that can expand
        "fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl shadow-float max-h-[60vh] lg:max-h-none",
        showPay ? "translate-y-0 lg:translate-y-0" : "translate-y-0"
      )}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" />
            Keranjang
          </h3>
          {totalItems > 0 && (
            <Badge variant="primary">{totalItems} item</Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 max-h-[35vh] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="text-sm mt-3 text-slate-400">Keranjang masih kosong</p>
              <p className="text-xs text-gray-300">Klik produk untuk menambahkan</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 group animate-fadeIn">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-400">{formatRupiah(item.unitPrice)} / {item.unit}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.productId, -1)}
                    className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors">
                    <Minus size={13} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-700">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)}
                    className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <p className="text-sm font-bold text-primary w-20 text-right">{formatRupiah(item.subtotal)}</p>
                <button onClick={() => setCart(prev => prev.filter(c => c.productId !== item.productId))}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/30">
          {/* Discount display */}
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600 font-semibold">Diskon</span>
              <span className="text-emerald-600 font-bold">-{formatRupiah(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Total{discountAmount > 0 ? " Akhir" : " Pembayaran"}</span>
            <span className="text-2xl font-extrabold text-primary">{formatRupiah(grandTotal)}</span>
          </div>

          {/* Action buttons row */}
          <div className="flex gap-2">
            {heldCarts.length > 0 && (
              <Button variant="secondary" size="md" onClick={() => setShowHeld(true)} title="Lihat transaksi ditahan">
                <Play size={16} /> {heldCarts.length}
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={holdCart} disabled={!cart.length} title="Tahan transaksi (F2)">
              <Pause size={16} /> Hold
            </Button>
            <Button variant="secondary" size="md" onClick={() => setShowDiscount(true)} disabled={!cart.length} title="Atur diskon">
              <Tag size={16} /> Diskon
            </Button>
          </div>

          <Button variant="primary" size="lg" className="w-full" disabled={!cart.length} onClick={() => setShowPay(true)}>
            <CreditCard size={18} /> Bayar Sekarang (F1)
          </Button>

          {/* Scan indicator */}
          {scanFlash && (
            <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold text-primary animate-fadeIn">
              <ScanLine size={14} className="animate-pulse" /> Barcode terdeteksi!
            </div>
          )}
        </div>
      </div>

      {/* Held Carts Modal */}
      <Modal open={showHeld} onClose={() => setShowHeld(false)} size="md">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900">Transaksi Ditahan</h3>
            <button onClick={() => setShowHeld(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          {heldCarts.length === 0 ? (
            <EmptyState icon="clipboard-list" title="Belum ada transaksi ditahan" />
          ) : (
            <div className="space-y-2">
              {heldCarts.map((held) => {
                const heldTotal = held.cart.reduce((s, c) => s + parseFloat(c.subtotal), 0);
                return (
                  <div key={held.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-700">{held.customerName || "Pelanggan"}</p>
                      <p className="text-xs text-slate-400">{held.cart.length} item • {formatRupiah(heldTotal)}</p>
                      <p className="text-[10px] text-slate-400">{new Date(held.timestamp).toLocaleTimeString("id-ID")}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="primary" size="sm" onClick={() => resumeCart(held)}>
                        <Play size={14} /> Lanjut
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setHeldCarts(prev => prev.filter(h => h.id !== held.id))}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Discount Modal */}
      <Modal open={showDiscount} onClose={() => setShowDiscount(false)} size="sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900">Diskon</h3>
            <button onClick={() => setShowDiscount(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setDiscountType("none")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${discountType === "none" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>Tanpa Diskon</button>
              <button onClick={() => setDiscountType("percent")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${discountType === "percent" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>Persen (%)</button>
              <button onClick={() => setDiscountType("rupiah")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${discountType === "rupiah" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>Rupiah</button>
            </div>
            {discountType !== "none" && (
              <Input
                label={discountType === "percent" ? "Diskon (%)" : "Diskon (Rp)"}
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? "10" : "5000"}
                autoFocus
              />
            )}
            {discountAmount > 0 && (
              <div className="p-3 bg-emerald-50 rounded-xl text-sm flex justify-between">
                <span className="font-semibold text-emerald-700">Total Diskon:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <Button variant="primary" className="w-full" onClick={() => setShowDiscount(false)}>
              Terapkan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pay Modal */}
      <Modal open={showPay} onClose={() => setShowPay(false)}>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-800">Pembayaran</h3>
            <button onClick={() => setShowPay(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <Input label="Nama Pelanggan (opsional)" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nama pelanggan" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { m: "cash", icon: "banknote", label: "Tunai" },
                { m: "transfer", icon: "landmark", label: "Transfer" },
                { m: "qris", icon: "smartphone", label: "QRIS" },
              ] as const).map(({ m, icon, label }) => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={cn(
                    "py-3 rounded-xl text-sm font-semibold border-2 transition-all flex flex-col items-center gap-1.5",
                    payMethod === m ? "bg-primary/5 border-primary text-primary" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}>
                  <DynamicIcon name={icon} size={20} className={payMethod === m ? "text-primary" : "text-slate-500"} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-blue-50 border-primary/10">
            <div className="flex justify-between text-lg font-extrabold">
              <span className="text-slate-600">Total</span>
              <span className="text-primary">{formatRupiah(grandTotal)}</span>
            </div>
          </Card>
          {payMethod === "cash" && (
            <div className="space-y-2">
              <CurrencyInput label="Uang Diterima" value={cashAmt} onChange={(v) => setCashAmt(String(v))} placeholder="0" autoFocus />
              {parseFloat(cashAmt || "0") >= total && parseFloat(cashAmt || "0") > 0 && (
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <span className="text-emerald-600 font-bold text-lg">Kembalian: {formatRupiah(change)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setShowPay(false)}>Batal</Button>
            <Button variant="success" size="lg" className="flex-1" onClick={doCheckout}
              disabled={submitting || (payMethod === "cash" && parseFloat(cashAmt || "0") < grandTotal)}>
              {submitting ? "Memproses..." : "Konfirmasi Bayar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Done Modal — Sprint 1: Receipt success screen */}
      <Modal open={showDone} onClose={() => setShowDone(false)} size="sm">
        <div className="p-8 text-center space-y-5">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center animate-bounceIn">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Transaksi Berhasil!</h3>
            <p className="text-sm text-slate-400 mt-1">Struk siap dicetak</p>
          </div>

          {/* Receipt Preview — collapsible */}
          {lastTrxData && (
            <div className="space-y-2">
              <button
                onClick={() => setShowReceiptPreview(!showReceiptPreview)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between text-sm font-medium text-slate-700"
              >
                <span className="flex items-center gap-2"><Printer size={14} /> Preview Struk</span>
                <span className="text-xs text-slate-400">{showReceiptPreview ? "Sembunyikan" : "Tampilkan"}</span>
              </button>
              {showReceiptPreview && (
                <div className="overflow-auto max-h-64 p-2 bg-slate-100 rounded-xl">
                  <ReceiptPreview data={lastTrxData} width={58} />
                </div>
              )}
            </div>
          )}

          {/* Summary — quick glance */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">No. Invoice</span>
              <span className="font-mono font-bold text-primary">{lastInv}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">Total</span>
              <span className="font-bold text-slate-800">{formatRupiah(lastTrxData?.summary.total ?? grandTotal)}</span>
            </div>
            {lastTrxData?.summary.discount && lastTrxData.summary.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-semibold">Diskon</span>
                <span className="font-bold text-emerald-600">-{formatRupiah(lastTrxData.summary.discount)}</span>
              </div>
            )}
            {lastTrxData?.summary.paid && lastTrxData.summary.paid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-semibold">Bayar</span>
                <span className="font-bold text-slate-800">{formatRupiah(lastTrxData.summary.paid)}</span>
              </div>
            )}
            {lastTrxData?.summary.change && lastTrxData.summary.change > 0 && (
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-semibold">Kembalian</span>
                <span className="font-bold text-emerald-600">{formatRupiah(lastTrxData.summary.change)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!lastTrxData}
              onClick={() => {
                if (!lastTrxData) return;
                // Try print via Electron thermal printer
                if (typeof window !== "undefined" && window.electronAPI) {
                  window.electronAPI.printer.print(lastTrxData);
                } else {
                  // Fallback: browser print with receipt preview
                  window.print();
                }
              }}
            >
              <Printer size={18} /> Cetak Struk
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => { setShowDone(false); setShowReceiptPreview(false); }}>
                Transaksi Baru
              </Button>
              <Button variant="ghost" size="md" className="flex-1" onClick={() => {
                setShowDone(false);
                setShowReceiptPreview(false);
                window.location.hash = "history";
              }}>
                Lihat Riwayat
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
