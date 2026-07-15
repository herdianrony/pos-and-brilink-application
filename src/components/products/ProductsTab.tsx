"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Select, Card, Badge, Spinner, EmptyState, ConfirmDialog, useToast } from "@/components/ui";
import { Plus, Pencil, Trash2, X, Package, Search } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import type { Product, Category } from "@/types/models";

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [f, setF] = useState({ name: "", barcode: "", categoryId: "", buyPrice: "", sellPrice: "", stock: "", minStock: "5", unit: "pcs", image: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const p = new URLSearchParams(); if (search) p.set("search", search);
    const r = await fetch(`/api/products?${p}`);
    setProducts(await r.json()); setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/categories").then(r => r.json()).then(setCategories); }, []);

  function openAdd() {
    setEdit(null); setF({ name: "", barcode: "", categoryId: "", buyPrice: "", sellPrice: "", stock: "", minStock: "5", unit: "pcs", image: "" }); setModal(true);
  }
  function openEdit(p: Product) {
    setEdit(p); setF({ name: p.name, barcode: p.barcode || "", categoryId: p.categoryId?.toString() || "", buyPrice: p.buyPrice, sellPrice: p.sellPrice, stock: p.stock.toString(), minStock: p.minStock.toString(), unit: p.unit || "pcs", image: p.image || "" }); setModal(true);
  }
  async function save() {
    if (!f.name || !f.sellPrice) return; setSaving(true);
    const body = { ...(edit ? { id: edit.id } : {}), name: f.name, barcode: f.barcode || null, categoryId: f.categoryId ? parseInt(f.categoryId) : null, buyPrice: f.buyPrice || "0", sellPrice: f.sellPrice, stock: parseInt(f.stock || "0"), minStock: parseInt(f.minStock || "5"), unit: f.unit, image: f.image || null };
    await fetch("/api/products", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setModal(false); load(); setSaving(false);
    toast.success(edit ? "Produk berhasil diupdate" : "Produk berhasil ditambahkan");
  }
  async function del(id: number) {
    await fetch("/api/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
    toast.success("Produk berhasil dihapus");
  }

  const margin = f.buyPrice && f.sellPrice ? parseFloat(f.sellPrice) - parseFloat(f.buyPrice) : 0;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm shadow-soft" />
        </div>
        <Button onClick={openAdd}><Plus size={16} /> Tambah Produk</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? <Spinner /> : products.length === 0 ? <EmptyState icon="package" title="Belum ada produk" subtitle="Tambah produk pertama Anda" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="text-left p-3 font-medium">Produk</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-right p-3 font-medium">Harga Beli</th>
                <th className="text-right p-3 font-medium">Harga Jual</th>
                <th className="text-right p-3 font-medium">Margin</th>
                <th className="text-right p-3 font-medium">Stok</th>
                <th className="text-center p-3 font-medium">Aksi</th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-t border-slate-50 hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                        ) : (
                          <DynamicIcon name={p.categoryIcon} fallback="package" size={18} className="text-slate-600" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          {p.barcode && <p className="text-[11px] text-slate-400 font-mono">{p.barcode}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 text-xs">{p.categoryName || "—"}</td>
                    <td className="p-3 text-right text-slate-500">{formatRupiah(p.buyPrice)}</td>
                    <td className="p-3 text-right font-semibold text-primary">{formatRupiah(p.sellPrice)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatRupiah(parseFloat(p.sellPrice) - parseFloat(p.buyPrice))}</td>
                    <td className="p-3 text-right">
                      <Badge variant={p.stock <= p.minStock ? "danger" : p.stock <= p.minStock * 2 ? "warning" : "success"}>
                        {p.stock} {p.unit}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl"><Pencil size={14} /></button>
                        <button onClick={() => setConfirmDel(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)}>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">{edit ? "Edit Produk" : "Tambah Produk"}</h3>
            <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Produk *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama produk" />
            <Input label="Barcode" value={f.barcode} onChange={e => setF({ ...f, barcode: e.target.value })} placeholder="Barcode" />

            {/* Foto Produk */}
            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-slate-700 mb-2 block">Foto Produk (opsional)</label>
              <div className="flex items-center gap-3">
                {f.image ? (
                  <img src={f.image} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                    <Package size={24} className="text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500000) {
                        toast.warning("Ukuran gambar maksimal 500KB");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setF({ ...f, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label htmlFor="product-image-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all">
                    <Plus size={16} /> Pilih Gambar
                  </label>
                  {f.image && (
                    <button onClick={() => setF({ ...f, image: "" })} className="ml-2 text-xs text-red-500 font-bold hover:underline">
                      Hapus
                    </button>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">Maks 500KB, format JPG/PNG/WebP</p>
                </div>
              </div>
            </div>

            <Select label="Kategori" value={f.categoryId} onChange={e => setF({ ...f, categoryId: e.target.value })}>
              <option value="">— Pilih —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Satuan" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })}>
              {["pcs","botol","bungkus","kg","liter","karung","tabung","lusin","sachet","box","pak","rim"].map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
            <Input label="Harga Beli" type="number" value={f.buyPrice} onChange={e => setF({ ...f, buyPrice: e.target.value })} placeholder="0" />
            <Input label="Harga Jual *" type="number" value={f.sellPrice} onChange={e => setF({ ...f, sellPrice: e.target.value })} placeholder="0" />
            <Input label="Stok" type="number" value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })} placeholder="0" />
            <Input label="Stok Minimum" type="number" value={f.minStock} onChange={e => setF({ ...f, minStock: e.target.value })} placeholder="5" />
          </div>
          {f.buyPrice && f.sellPrice && (
            <div className={cn("rounded-xl p-3 text-sm font-medium", margin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
              Margin: {formatRupiah(margin)} {parseFloat(f.buyPrice) > 0 ? `(${((margin / parseFloat(f.buyPrice)) * 100).toFixed(1)}%)` : ""}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !f.name || !f.sellPrice}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (confirmDel !== null) {
            await del(confirmDel);
            setConfirmDel(null);
          }
        }}
        title="Hapus Produk?"
        message="Produk akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        variant="danger"
        confirmText="Hapus"
      />
    </>
  );
}

// ════════════════════════════════════════════════════
// PRODUCT CATEGORIES TAB
// ════════════════════════════════════════════════════
