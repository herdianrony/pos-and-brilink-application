"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Badge, Spinner, EmptyState, Card } from "@/components/ui";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingBag, CheckCircle, X } from "lucide-react";

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
  const [submitting, setSubmitting] = useState(false);

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
  const change = parseFloat(cashAmt || "0") - total;

  async function doCheckout() {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pos", items: cart, totalAmount: total, customerName: customerName || null, paymentMethod: payMethod }),
      });
      const trx = await res.json();
      setLastInv(trx.invoiceNo);
      setShowPay(false);
      setShowDone(true);
      setCart([]);
      setCustomerName("");
      setCashAmt("");
      fetchProducts();
    } catch { alert("Gagal memproses transaksi"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-2rem)] animate-fadeIn">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-800">Kasir POS</h2>
            <p className="text-sm text-zinc-400">Pilih produk untuk ditambahkan</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari produk atau scan barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCatFilter("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              catFilter === "all" ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white text-zinc-600 border border-zinc-200 hover:border-primary/30"
            )}
          >Semua</button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(c.id.toString())}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                catFilter === c.id.toString() ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white text-zinc-600 border border-zinc-200 hover:border-primary/30"
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
                      inCart ? "bg-primary/5 border-primary shadow-md shadow-primary/10" : "bg-white border-transparent hover:border-zinc-200 hover:shadow-lg",
                      p.stock <= 0 && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                      <DynamicIcon name={p.categoryIcon} fallback="package" size={20} className="text-primary" />
                    </div>
                    <p className="font-semibold text-sm text-zinc-800 leading-tight line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-primary font-bold text-base">{formatRupiah(p.sellPrice)}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full",
                        p.stock <= 5 ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-500"
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

      {/* Right: Cart */}
      <div className="w-full lg:w-[380px] bg-white rounded-2xl shadow-lg border border-zinc-100 flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-800 flex items-center gap-2">
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
              <p className="text-sm mt-3 text-zinc-400">Keranjang masih kosong</p>
              <p className="text-xs text-gray-300">Klik produk untuk menambahkan</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-zinc-50/80 rounded-xl border border-zinc-100 group animate-fadeIn">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-700 truncate">{item.productName}</p>
                  <p className="text-xs text-zinc-400">{formatRupiah(item.unitPrice)} / {item.unit}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.productId, -1)}
                    className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors">
                    <Minus size={13} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-zinc-700">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 transition-colors">
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

        <div className="p-4 border-t border-zinc-100 space-y-3 bg-zinc-50/30">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-medium">Total Pembayaran</span>
            <span className="text-2xl font-bold text-primary">{formatRupiah(total)}</span>
          </div>
          <Button variant="accent" size="lg" className="w-full" disabled={!cart.length} onClick={() => setShowPay(true)}>
            <CreditCard size={18} /> Bayar Sekarang
          </Button>
        </div>
      </div>

      {/* Pay Modal */}
      <Modal open={showPay} onClose={() => setShowPay(false)}>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-zinc-800">Pembayaran</h3>
            <button onClick={() => setShowPay(false)} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
          </div>
          <Input label="Nama Pelanggan (opsional)" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nama pelanggan" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-600">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { m: "cash", icon: "banknote", label: "Tunai" },
                { m: "transfer", icon: "landmark", label: "Transfer" },
                { m: "qris", icon: "smartphone", label: "QRIS" },
              ] as const).map(({ m, icon, label }) => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={cn(
                    "py-3 rounded-xl text-sm font-semibold border-2 transition-all flex flex-col items-center gap-1.5",
                    payMethod === m ? "bg-primary/5 border-primary text-primary" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  )}>
                  <DynamicIcon name={icon} size={20} className={payMethod === m ? "text-primary" : "text-zinc-500"} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-blue-50 border-primary/10">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-zinc-600">Total</span>
              <span className="text-primary">{formatRupiah(total)}</span>
            </div>
          </Card>
          {payMethod === "cash" && (
            <div className="space-y-2">
              <Input label="Uang Diterima" type="number" value={cashAmt} onChange={e => setCashAmt(e.target.value)} placeholder="0" className="text-xl font-bold" />
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
              disabled={submitting || (payMethod === "cash" && parseFloat(cashAmt || "0") < total)}>
              {submitting ? "Memproses..." : "Konfirmasi Bayar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Done Modal */}
      <Modal open={showDone} onClose={() => setShowDone(false)} size="sm">
        <div className="p-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-800">Transaksi Berhasil!</h3>
          <div className="bg-zinc-50 rounded-xl p-3">
            <p className="text-xs text-zinc-400">No. Invoice</p>
            <p className="font-mono font-bold text-lg text-primary">{lastInv}</p>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={() => setShowDone(false)}>
            Transaksi Baru
          </Button>
        </div>
      </Modal>
    </div>
  );
}
