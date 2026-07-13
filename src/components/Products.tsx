"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Select, Card, Badge, Spinner, EmptyState, Tabs } from "@/components/ui";
import { Plus, Pencil, Trash2, X, Package, Tags, Landmark, Search, Layers } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";

// ── Types ─────────────────────────────────────────
interface Product {
  id: number; name: string; barcode: string | null;
  categoryId: number | null; categoryName: string | null; categoryIcon: string | null;
  buyPrice: string; sellPrice: string; stock: number; minStock: number; unit: string | null;
}
interface Category { id: number; name: string; icon: string | null; color: string | null; isActive: boolean; }
interface ServiceCat { id: number; name: string; icon: string | null; color: string | null; sortOrder: number; }
interface FeeTier {
  id?: number;
  minAmount: string;
  maxAmount: string | null;
  adminFee: string;
  agentFee: string;
}

interface BLService {
  id: number; name: string; categoryId: number | null; categoryName: string | null;
  icon: string | null; adminFee: string; agentFee: string;
  useTieredFee: boolean;
  feeTiers: FeeTier[];
  cashEffect: string; bankEffect: string;
  description: string | null;
}

// ── Icon Picker Data ──────────────────────────────
// Lucide icon names yang tersedia untuk dipilih saat membuat kategori/layanan/akun.
import { AVAILABLE_ICONS } from "@/components/DynamicIcon";
const icons = AVAILABLE_ICONS;

export default function Products() {
  const [tab, setTab] = useState("products");

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Manajemen Data</h2>
        <p className="text-sm text-gray-400">Kelola produk, kategori, dan layanan BRILink</p>
      </div>
      <Tabs
        tabs={[
          { id: "products", label: "Produk", icon: "package" },
          { id: "categories", label: "Kategori Produk", icon: "tag" },
          { id: "bl_services", label: "Layanan BRILink", icon: "landmark" },
          { id: "bl_categories", label: "Kategori Layanan", icon: "folder-open" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "bl_services" && <BLServicesTab />}
      {tab === "bl_categories" && <BLCategoriesTab />}
    </div>
  );
}

// ════════════════════════════════════════════════════
// PRODUCTS TAB
// ════════════════════════════════════════════════════
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [f, setF] = useState({ name: "", barcode: "", categoryId: "", buyPrice: "", sellPrice: "", stock: "", minStock: "5", unit: "pcs" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const p = new URLSearchParams(); if (search) p.set("search", search);
    const r = await fetch(`/api/products?${p}`);
    setProducts(await r.json()); setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/categories").then(r => r.json()).then(setCategories); }, []);

  function openAdd() {
    setEdit(null); setF({ name: "", barcode: "", categoryId: "", buyPrice: "", sellPrice: "", stock: "", minStock: "5", unit: "pcs" }); setModal(true);
  }
  function openEdit(p: Product) {
    setEdit(p); setF({ name: p.name, barcode: p.barcode || "", categoryId: p.categoryId?.toString() || "", buyPrice: p.buyPrice, sellPrice: p.sellPrice, stock: p.stock.toString(), minStock: p.minStock.toString(), unit: p.unit || "pcs" }); setModal(true);
  }
  async function save() {
    if (!f.name || !f.sellPrice) return; setSaving(true);
    const body = { ...(edit ? { id: edit.id } : {}), name: f.name, barcode: f.barcode || null, categoryId: f.categoryId ? parseInt(f.categoryId) : null, buyPrice: f.buyPrice || "0", sellPrice: f.sellPrice, stock: parseInt(f.stock || "0"), minStock: parseInt(f.minStock || "5"), unit: f.unit };
    await fetch("/api/products", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setModal(false); load(); setSaving(false);
  }
  async function del(id: number) {
    if (!confirm("Hapus produk ini?")) return;
    await fetch("/api/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  const margin = f.buyPrice && f.sellPrice ? parseFloat(f.sellPrice) - parseFloat(f.buyPrice) : 0;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm shadow-sm" />
        </div>
        <Button onClick={openAdd}><Plus size={16} /> Tambah Produk</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? <Spinner /> : products.length === 0 ? <EmptyState icon="package" title="Belum ada produk" subtitle="Tambah produk pertama Anda" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/80">
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
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={p.categoryIcon} fallback="package" size={18} className="text-gray-600" />
                        <div>
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          {p.barcode && <p className="text-[11px] text-gray-400 font-mono">{p.barcode}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{p.categoryName || "—"}</td>
                    <td className="p-3 text-right text-gray-500">{formatRupiah(p.buyPrice)}</td>
                    <td className="p-3 text-right font-semibold text-primary">{formatRupiah(p.sellPrice)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatRupiah(parseFloat(p.sellPrice) - parseFloat(p.buyPrice))}</td>
                    <td className="p-3 text-right">
                      <Badge variant={p.stock <= p.minStock ? "danger" : p.stock <= p.minStock * 2 ? "warning" : "success"}>
                        {p.stock} {p.unit}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => del(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{edit ? "Edit Produk" : "Tambah Produk"}</h3>
            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Produk *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama produk" />
            <Input label="Barcode" value={f.barcode} onChange={e => setF({ ...f, barcode: e.target.value })} placeholder="Barcode" />
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
    </>
  );
}

// ════════════════════════════════════════════════════
// PRODUCT CATEGORIES TAB
// ════════════════════════════════════════════════════
function CategoriesTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [f, setF] = useState({ name: "", icon: "package", color: "#6366f1" });
  const [saving, setSaving] = useState(false);

  async function load() { setCats(await (await fetch("/api/categories")).json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openAdd() { setEdit(null); setF({ name: "", icon: "package", color: "#6366f1" }); setModal(true); }
  function openEdit(c: Category) { setEdit(c); setF({ name: c.name, icon: c.icon || "package", color: c.color || "#6366f1" }); setModal(true); }
  async function save() {
    if (!f.name) return; setSaving(true);
    await fetch("/api/categories", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(edit ? { id: edit.id } : {}), ...f }) });
    setModal(false); load(); setSaving(false);
  }
  async function del(id: number) {
    if (!confirm("Hapus kategori?")) return;
    await fetch("/api/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={openAdd}><Plus size={16} /> Tambah Kategori</Button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? <Spinner /> : cats.length === 0 ? <EmptyState icon="tag" title="Belum ada kategori" /> :
          cats.map(c => (
            <Card key={c.id} className="p-4 flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${c.color}15` }}><DynamicIcon name={c.icon} fallback="package" size={24} className="text-gray-700" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{c.name}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                <button onClick={() => del(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))
        }
      </div>

      <Modal open={modal} onClose={() => setModal(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold">{edit ? "Edit Kategori" : "Tambah Kategori"}</h3>
          <Input label="Nama Kategori" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama kategori" />
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Pilih Ikon</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-50 rounded-xl p-3">
              {icons.slice(0, 30).map(em => (
                <button key={em} onClick={() => setF({ ...f, icon: em })}
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all", f.icon === em ? "bg-primary/10 ring-2 ring-primary scale-110" : "hover:bg-gray-200")}><DynamicIcon name={em} size={18} className="text-gray-700" /></button>
              ))}
            </div>
          </div>
          <Input label="Warna" type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !f.name}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ════════════════════════════════════════════════════
// BRILINK SERVICES TAB (with Fee Tiers)
// ════════════════════════════════════════════════════
function BLServicesTab() {
  const [svcs, setSvcs] = useState<BLService[]>([]);
  const [cats, setCats] = useState<ServiceCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [tiersModal, setTiersModal] = useState(false);
  const [edit, setEdit] = useState<BLService | null>(null);
  const [f, setF] = useState({ name: "", categoryId: "", icon: "credit-card", adminFee: "", agentFee: "", useTieredFee: false, cashEffect: "in", bankEffect: "out", description: "" });
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, c] = await Promise.all([fetch("/api/brilink-services").then(r => r.json()), fetch("/api/service-categories").then(r => r.json())]);
    setSvcs(s); setCats(c); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { 
    setEdit(null); 
    setF({ name: "", categoryId: "", icon: "credit-card", adminFee: "", agentFee: "", useTieredFee: false, cashEffect: "in", bankEffect: "out", description: "" }); 
    setTiers([]);
    setModal(true); 
  }
  function openEdit(s: BLService) {
    setEdit(s); 
    setF({ name: s.name, categoryId: s.categoryId?.toString() || "", icon: s.icon || "credit-card", adminFee: s.adminFee, agentFee: s.agentFee, useTieredFee: s.useTieredFee, cashEffect: s.cashEffect || "in", bankEffect: s.bankEffect || "out", description: s.description || "" }); 
    setTiers(s.feeTiers || []);
    setModal(true);
  }
  function openTiers(s: BLService) {
    setEdit(s);
    setTiers(s.feeTiers || []);
    setTiersModal(true);
  }
  
  function addTier() {
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].maxAmount : "0";
    setTiers([...tiers, { 
      minAmount: lastMax ? (parseFloat(lastMax) + 1).toString() : "0", 
      maxAmount: null, 
      adminFee: "", 
      agentFee: "" 
    }]);
  }
  function updateTier(idx: number, field: keyof FeeTier, value: string | null) {
    setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }
  function removeTier(idx: number) {
    setTiers(tiers.filter((_, i) => i !== idx));
  }
  
  async function save() {
    if (!f.name) return; setSaving(true);
    const res = await fetch("/api/brilink-services", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(edit ? { id: edit.id } : {}), name: f.name, categoryId: f.categoryId ? parseInt(f.categoryId) : null, icon: f.icon, adminFee: f.adminFee || "0", agentFee: f.agentFee || "0", useTieredFee: f.useTieredFee, cashEffect: f.cashEffect, bankEffect: f.bankEffect, description: f.description || null })
    });
    const svc = await res.json();
    
    // Save fee tiers if using tiered fee
    if (f.useTieredFee && tiers.length > 0) {
      await fetch("/api/fee-tiers", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_tiers", serviceId: edit?.id || svc.id, tiers })
      });
    }
    
    setModal(false); load(); setSaving(false);
  }
  
  async function saveTiers() {
    if (!edit) return;
    setSaving(true);
    await fetch("/api/fee-tiers", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_tiers", serviceId: edit.id, tiers })
    });
    // Update useTieredFee flag
    await fetch("/api/brilink-services", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: edit.id, name: edit.name, useTieredFee: tiers.length > 0, adminFee: edit.adminFee, agentFee: edit.agentFee, cashEffect: edit.cashEffect, bankEffect: edit.bankEffect })
    });
    setTiersModal(false); load(); setSaving(false);
  }
  
  async function del(id: number) {
    if (!confirm("Hapus layanan?")) return;
    await fetch("/api/brilink-services", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={openAdd}><Plus size={16} /> Tambah Layanan</Button></div>
      <Card className="overflow-hidden">
        {loading ? <Spinner /> : svcs.length === 0 ? <EmptyState icon="landmark" title="Belum ada layanan" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/80">
                <th className="text-left p-3 font-medium">Layanan</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-right p-3 font-medium">Biaya Admin</th>
                <th className="text-right p-3 font-medium">Fee Agen</th>
                <th className="text-center p-3 font-medium">Aksi</th>
              </tr></thead>
              <tbody>
                {svcs.map(s => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-blue-50/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={s.icon} fallback="package" size={18} className="text-gray-600" />
                        <div>
                          <span className="font-semibold text-gray-800">{s.name}</span>
                          {s.useTieredFee && (
                            <span className="ml-2"><Badge variant="purple"><Layers size={10} className="inline" /> Berjenjang</Badge></span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{s.categoryName || "—"}</td>
                    <td className="p-3 text-right font-semibold text-amber-600">
                      {s.useTieredFee ? (
                        <span className="text-xs text-purple-600">{s.feeTiers?.length || 0} tier</span>
                      ) : formatRupiah(s.adminFee)}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600">
                      {s.useTieredFee ? "—" : formatRupiah(s.agentFee)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openTiers(s)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg" title="Atur Fee Berjenjang"><Layers size={14} /></button>
                        <button onClick={() => openEdit(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => del(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit/Add Service Modal */}
      <Modal open={modal} onClose={() => setModal(false)}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold">{edit ? "Edit Layanan" : "Tambah Layanan BRILink"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Layanan *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama layanan" />
            <Select label="Kategori" value={f.categoryId} onChange={e => setF({ ...f, categoryId: e.target.value })}>
              <option value="">— Pilih —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          
          {/* Fee Type Toggle */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={f.useTieredFee} 
                onChange={e => setF({ ...f, useTieredFee: e.target.checked })}
                className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <p className="font-semibold text-purple-800 flex items-center gap-1.5">
                  <Layers size={16} /> Gunakan Biaya Admin Berjenjang
                </p>
                <p className="text-xs text-purple-600">Fee otomatis berubah berdasarkan nominal transaksi</p>
              </div>
            </label>
          </div>
          
          {!f.useTieredFee ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Biaya Admin (ke Nasabah)" type="number" value={f.adminFee} onChange={e => setF({ ...f, adminFee: e.target.value })} placeholder="0" />
              <Input label="Fee Agen (Keuntungan Anda)" type="number" value={f.agentFee} onChange={e => setF({ ...f, agentFee: e.target.value })} placeholder="0" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Skema Fee Berjenjang:</p>
                <Button variant="ghost" size="sm" onClick={addTier}><Plus size={14} /> Tambah Tier</Button>
              </div>
              {tiers.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">Belum ada tier. Klik "Tambah Tier" untuk memulai.</p>
              ) : (
                <div className="space-y-2">
                  {tiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <input type="number" placeholder="Min" value={tier.minAmount} onChange={e => updateTier(idx, "minAmount", e.target.value)}
                          className="px-2 py-1.5 rounded border border-gray-200 text-sm" />
                        <input type="number" placeholder="Max (kosong=∞)" value={tier.maxAmount || ""} onChange={e => updateTier(idx, "maxAmount", e.target.value || null)}
                          className="px-2 py-1.5 rounded border border-gray-200 text-sm" />
                        <input type="number" placeholder="Admin" value={tier.adminFee} onChange={e => updateTier(idx, "adminFee", e.target.value)}
                          className="px-2 py-1.5 rounded border border-gray-200 text-sm" />
                        <input type="number" placeholder="Fee Agen" value={tier.agentFee} onChange={e => updateTier(idx, "agentFee", e.target.value)}
                          className="px-2 py-1.5 rounded border border-gray-200 text-sm" />
                      </div>
                      <button onClick={() => removeTier(idx)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">Format: Nominal Min | Nominal Max | Biaya Admin | Fee Agen</p>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Efek Kas Tunai" value={f.cashEffect} onChange={e => setF({ ...f, cashEffect: e.target.value })}>
              <option value="in">Masuk (nasabah bayar cash)</option>
              <option value="out">Keluar (kasih cash ke nasabah)</option>
              <option value="none">— Tidak ada efek</option>
            </Select>
            <Select label="Efek Saldo M-Banking" value={f.bankEffect} onChange={e => setF({ ...f, bankEffect: e.target.value })}>
              <option value="in">Masuk (terima transfer dari nasabah)</option>
              <option value="out">Keluar (transfer/bayar via mbanking)</option>
              <option value="none">— Tidak ada efek</option>
            </Select>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">Panduan Efek Saldo:</p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li><strong>Tarik Tunai:</strong> Cash minus keluar, M-Banking plus masuk</li>
              <li><strong>Transfer/Bayar/Setor:</strong> Cash plus masuk, M-Banking minus keluar</li>
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Pilih Ikon</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto bg-gray-50 rounded-xl p-3">
              {icons.slice(30).map(em => (
                <button key={em} onClick={() => setF({ ...f, icon: em })}
                  className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all", f.icon === em ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-gray-200")}><DynamicIcon name={em} size={18} className="text-gray-700" /></button>
              ))}
            </div>
          </div>
          <Input label="Deskripsi (opsional)" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Keterangan tambahan" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !f.name}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </Modal>
      
      {/* Fee Tiers Modal */}
      <Modal open={tiersModal} onClose={() => setTiersModal(false)} size="lg">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layers size={20} className="text-purple-500" />
                Atur Fee Berjenjang
              </h3>
              {edit && <p className="text-sm text-gray-500"><DynamicIcon name={edit.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />{edit.name}</p>}
            </div>
            <button onClick={() => setTiersModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700">
            <p className="font-medium">Contoh Skema Fee Tarik Tunai:</p>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li>Rp 0 - 500.000 → Admin Rp 5.000, Fee Rp 3.000</li>
              <li>Rp 500.001 - 2.000.000 → Admin Rp 7.500, Fee Rp 4.500</li>
              <li>Rp 2.000.001 - 5.000.000 → Admin Rp 10.000, Fee Rp 6.000</li>
              <li>&gt; Rp 5.000.000 → Admin Rp 15.000, Fee Rp 9.000</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Daftar Tier:</p>
              <Button variant="primary" size="sm" onClick={addTier}><Plus size={14} /> Tambah Tier</Button>
            </div>
            
            {tiers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Layers size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Belum ada tier</p>
                <p className="text-gray-300 text-xs">Klik "Tambah Tier" untuk membuat skema fee berjenjang</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-500 px-2">
                  <span>Nominal Min</span>
                  <span>Nominal Max</span>
                  <span>Biaya Admin</span>
                  <span>Fee Agen</span>
                  <span></span>
                </div>
                {tiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <input 
                        type="number" 
                        placeholder="Min" 
                        value={tier.minAmount} 
                        onChange={e => updateTier(idx, "minAmount", e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400" 
                      />
                      <input 
                        type="number" 
                        placeholder="Max (kosong=∞)" 
                        value={tier.maxAmount || ""} 
                        onChange={e => updateTier(idx, "maxAmount", e.target.value || null)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400" 
                      />
                      <input 
                        type="number" 
                        placeholder="Admin" 
                        value={tier.adminFee} 
                        onChange={e => updateTier(idx, "adminFee", e.target.value)}
                        className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400" 
                      />
                      <input 
                        type="number" 
                        placeholder="Fee" 
                        value={tier.agentFee} 
                        onChange={e => updateTier(idx, "agentFee", e.target.value)}
                        className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" 
                      />
                    </div>
                    <button onClick={() => removeTier(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" className="flex-1" onClick={() => setTiersModal(false)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={saveTiers} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Fee Berjenjang"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ════════════════════════════════════════════════════
// BRILINK SERVICE CATEGORIES TAB
// ════════════════════════════════════════════════════
function BLCategoriesTab() {
  const [cats, setCats] = useState<ServiceCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<ServiceCat | null>(null);
  const [f, setF] = useState({ name: "", icon: "credit-card", color: "#0ea5e9", sortOrder: "0" });
  const [saving, setSaving] = useState(false);

  async function load() { setCats(await (await fetch("/api/service-categories")).json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openAdd() { setEdit(null); setF({ name: "", icon: "credit-card", color: "#0ea5e9", sortOrder: "0" }); setModal(true); }
  function openEdit(c: ServiceCat) { setEdit(c); setF({ name: c.name, icon: c.icon || "credit-card", color: c.color || "#0ea5e9", sortOrder: c.sortOrder.toString() }); setModal(true); }
  async function save() {
    if (!f.name) return; setSaving(true);
    await fetch("/api/service-categories", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(edit ? { id: edit.id } : {}), name: f.name, icon: f.icon, color: f.color, sortOrder: parseInt(f.sortOrder || "0") })
    });
    setModal(false); load(); setSaving(false);
  }
  async function del(id: number) {
    if (!confirm("Hapus kategori layanan?")) return;
    await fetch("/api/service-categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={openAdd}><Plus size={16} /> Tambah Kategori</Button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? <Spinner /> : cats.length === 0 ? <EmptyState icon="folder-open" title="Belum ada kategori layanan" /> :
          cats.map(c => (
            <Card key={c.id} className="p-4 flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${c.color}15` }}><DynamicIcon name={c.icon} fallback="package" size={24} className="text-gray-700" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">Urutan: {c.sortOrder}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                <button onClick={() => del(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))
        }
      </div>

      <Modal open={modal} onClose={() => setModal(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold">{edit ? "Edit Kategori" : "Tambah Kategori Layanan"}</h3>
          <Input label="Nama" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama kategori" />
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Ikon</label>
            <div className="flex flex-wrap gap-2 bg-gray-50 rounded-xl p-3">
              {icons.slice(30, 60).map(em => (
                <button key={em} onClick={() => setF({ ...f, icon: em })}
                  className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-lg", f.icon === em ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-gray-200")}><DynamicIcon name={em} size={18} className="text-gray-700" /></button>
              ))}
            </div>
          </div>
          <Input label="Warna" type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} />
          <Input label="Urutan" type="number" value={f.sortOrder} onChange={e => setF({ ...f, sortOrder: e.target.value })} placeholder="0" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Batal</Button>
            <Button variant="primary" className="flex-1" onClick={save} disabled={saving || !f.name}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
