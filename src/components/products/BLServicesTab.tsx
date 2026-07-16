"use client";

import { useEffect, useState } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Select, Card, Badge, Spinner, EmptyState, ConfirmDialog, useToast } from "@/components/ui";
import { Plus, Pencil, Trash2, X, Layers } from "lucide-react";
import { DynamicIcon, AVAILABLE_ICONS } from "@/components/DynamicIcon";
import { CurrencyInput } from "@/components/CurrencyInput";
import { calculateBankFlow, calculateCashFlow, type FeeMethod, type FlowType } from "@/lib/service-flow";
import type { ServiceCategory as ServiceCat, FeeTier, AgentService as BLService } from "@/types/models";

const icons = AVAILABLE_ICONS;

type ServicePresetId = "cash_withdrawal" | "cash_deposit" | "transfer" | "payment" | "topup" | "inquiry" | "custom";

interface ServicePreset {
  id: ServicePresetId;
  title: string;
  desc: string;
  icon: string;
  cashEffect: "in" | "out" | "none";
  bankEffect: "in" | "out" | "none";
  flowType: FlowType;
  defaultFeeMethod: FeeMethod;
  example: string;
}

const SERVICE_PRESETS: ServicePreset[] = [
  {
    id: "cash_withdrawal",
    title: "Tarik Tunai",
    desc: "Pelanggan transfer ke rekening agen, kasir menyerahkan cash.",
    icon: "banknote",
    cashEffect: "out",
    bankEffect: "in",
    flowType: "cash_withdrawal",
    defaultFeeMethod: "charged",
    example: "Kas -100rb, rekening +105rb jika admin 5rb",
  },
  {
    id: "cash_deposit",
    title: "Setor Tunai",
    desc: "Kasir menerima cash, owner/agen transfer dari rekening.",
    icon: "wallet",
    cashEffect: "in",
    bankEffect: "out",
    flowType: "cash_deposit",
    defaultFeeMethod: "cash",
    example: "Kas +105rb, rekening -100rb jika admin 5rb",
  },
  {
    id: "transfer",
    title: "Transfer Tunai",
    desc: "Pelanggan bayar cash, agen mengirim transfer dari rekening.",
    icon: "arrow-up-right",
    cashEffect: "in",
    bankEffect: "out",
    flowType: "transfer",
    defaultFeeMethod: "cash",
    example: "Kas +105rb, rekening -100rb jika admin 5rb",
  },
  {
    id: "payment",
    title: "Pembayaran Tagihan",
    desc: "Pelanggan bayar cash, agen membayar provider dari rekening.",
    icon: "file-text",
    cashEffect: "in",
    bankEffect: "out",
    flowType: "payment",
    defaultFeeMethod: "cash",
    example: "Kas +total bayar, rekening -nominal tagihan",
  },
  {
    id: "topup",
    title: "Top Up / Pulsa",
    desc: "Pelanggan bayar cash, agen memproses top up dari saldo/rekening.",
    icon: "smartphone",
    cashEffect: "in",
    bankEffect: "out",
    flowType: "topup",
    defaultFeeMethod: "cash",
    example: "Kas +total bayar, rekening -nominal top up",
  },
  {
    id: "inquiry",
    title: "Inquiry / Cek Saldo",
    desc: "Hanya pencatatan informasi, tanpa perubahan kas/rekening.",
    icon: "search",
    cashEffect: "none",
    bankEffect: "none",
    flowType: "inquiry",
    defaultFeeMethod: "cash",
    example: "Kas dan rekening tidak berubah",
  },
  {
    id: "custom",
    title: "Custom",
    desc: "Atur sendiri efek kas, rekening, dan jenis flow layanan.",
    icon: "settings",
    cashEffect: "in",
    bankEffect: "out",
    flowType: "payment",
    defaultFeeMethod: "cash",
    example: "Untuk SOP khusus bisnis Anda",
  },
];

export default function BLServicesTab() {
  const [svcs, setSvcs] = useState<BLService[]>([]);
  const [cats, setCats] = useState<ServiceCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [tiersModal, setTiersModal] = useState(false);
  const [edit, setEdit] = useState<BLService | null>(null);
  const [f, setF] = useState({ name: "", categoryId: "", icon: "credit-card", adminFee: "", agentFee: "", profitDifferent: false, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash", presetId: "custom" as ServicePresetId, description: "" });
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const toast = useToast();

  async function load() {
    const [s, c] = await Promise.all([fetch("/api/brilink-services").then(r => r.json()), fetch("/api/service-categories").then(r => r.json())]);
    setSvcs(s); setCats(c); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { 
    setEdit(null); 
    setF({ name: "", categoryId: "", icon: "credit-card", adminFee: "", agentFee: "", profitDifferent: false, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash", presetId: "custom", description: "" }); 
    setTiers([]);
    setModal(true); 
  }
  function openEdit(s: BLService) {
    setEdit(s); 
    setF({ name: s.name, categoryId: s.categoryId?.toString() || "", icon: s.icon || "credit-card", adminFee: s.adminFee, agentFee: s.agentFee, profitDifferent: Number(s.adminFee) !== Number(s.agentFee), useTieredFee: s.useTieredFee, cashEffect: s.cashEffect || "in", bankEffect: s.bankEffect || "out", flowType: (s.flowType || "payment") as FlowType, defaultFeeMethod: (s.defaultFeeMethod || "cash") as FeeMethod, presetId: "custom", description: s.description || "" }); 
    setTiers(s.feeTiers || []);
    setModal(true);
  }
  function openTiers(s: BLService) {
    setEdit(s);
    setTiers(s.feeTiers || []);
    setTiersModal(true);
  }

  function applyPreset(preset: ServicePreset) {
    setF(prev => ({
      ...prev,
      presetId: preset.id,
      name: prev.name || (preset.id === "custom" ? "" : preset.title),
      icon: preset.icon,
      cashEffect: preset.cashEffect,
      bankEffect: preset.bankEffect,
      flowType: preset.flowType,
      defaultFeeMethod: preset.defaultFeeMethod,
    }));
  }

  const simulationNominal = 100000;
  const simulationAdminFee = Number(f.adminFee || 0);
  const simulationAgentFee = f.profitDifferent ? Number(f.agentFee || 0) : simulationAdminFee;
  const simulationCash = calculateCashFlow(f.cashEffect, simulationNominal, simulationAdminFee, f.defaultFeeMethod as FeeMethod);
  const simulationBank = calculateBankFlow(f.cashEffect, f.bankEffect, simulationNominal, simulationAdminFee, f.defaultFeeMethod as FeeMethod);
  
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
    setTiers(tiers.map((t, i) => {
      if (i !== idx) return t;
      const next = { ...t, [field]: value };
      // UX sederhana: profit agen mengikuti biaya admin pada tier.
      // Jika nanti butuh selisih provider/upline, bisa ditambahkan mode advanced per tier.
      if (field === "adminFee") next.agentFee = value || "0";
      return next;
    }));
  }
  function removeTier(idx: number) {
    setTiers(tiers.filter((_, i) => i !== idx));
  }
  
  async function save() {
    if (!f.name) return; setSaving(true);
    const agentFee = f.profitDifferent ? (f.agentFee || "0") : (f.adminFee || "0");
    const res = await fetch("/api/brilink-services", { method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(edit ? { id: edit.id } : {}), name: f.name, categoryId: f.categoryId ? parseInt(f.categoryId) : null, icon: f.icon, adminFee: f.adminFee || "0", agentFee, useTieredFee: f.useTieredFee, cashEffect: f.cashEffect, bankEffect: f.bankEffect, flowType: f.flowType, defaultFeeMethod: f.defaultFeeMethod, description: f.description || null })
    });
    const svc = await res.json();
    
    // Save fee tiers if using tiered fee
    if (f.useTieredFee && tiers.length > 0) {
      await fetch("/api/fee-tiers", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_tiers", serviceId: edit?.id || svc.id, tiers })
      });
    }
    
    setModal(false); load(); setSaving(false);
    toast.success(edit ? "Layanan berhasil diupdate" : "Layanan berhasil ditambahkan");
  }
  
  async function saveTiers() {
    if (!edit) return;
    setSaving(true);
    await fetch("/api/fee-tiers", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_tiers", serviceId: edit.id, tiers })
    });
    // Update useTieredFee flag
    await fetch("/api/brilink-services", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: edit.id, name: edit.name, useTieredFee: tiers.length > 0, adminFee: edit.adminFee, agentFee: edit.agentFee, cashEffect: edit.cashEffect, bankEffect: edit.bankEffect, flowType: edit.flowType, defaultFeeMethod: edit.defaultFeeMethod })
    });
    setTiersModal(false); load(); setSaving(false);
  }
  
  async function del(id: number) {
    await fetch("/api/brilink-services", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
    toast.success("Layanan berhasil dihapus");
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={openAdd}><Plus size={16} /> Tambah Layanan</Button></div>
      <Card className="overflow-hidden">
        {loading ? <Spinner /> : svcs.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <EmptyState icon="landmark" title="Belum ada layanan agen" subtitle="Buat layanan pertama sesuai SOP usaha Anda: Tarik Tunai, Setor Tunai, Transfer, Pembayaran, Top Up, atau layanan custom." />
            <Button onClick={openAdd}><Plus size={16} /> Buat Layanan Pertama</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="text-left p-3 font-medium">Layanan</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-right p-3 font-medium">Biaya Admin</th>
                <th className="text-right p-3 font-medium">Fee Agen</th>
                <th className="text-center p-3 font-medium">Aksi</th>
              </tr></thead>
              <tbody>
                {svcs.map(s => (
                  <tr key={s.id} className="border-t border-slate-50 hover:bg-emerald-50/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={s.icon} fallback="package" size={18} className="text-slate-600" />
                        <div>
                          <span className="font-semibold text-slate-800">{s.name}</span>
                          {s.useTieredFee && (
                            <span className="ml-2"><Badge variant="purple"><Layers size={10} className="inline" /> Berjenjang</Badge></span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 text-xs">{s.categoryName || "—"}</td>
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
                        <button onClick={() => openTiers(s)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-xl" title="Atur Fee Berjenjang"><Layers size={14} /></button>
                        <button onClick={() => openEdit(s)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl"><Pencil size={14} /></button>
                        <button onClick={() => setConfirmDel(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={14} /></button>
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
      <Modal open={modal} onClose={() => setModal(false)} size="xl">
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-extrabold">{edit ? "Edit Layanan" : "Tambah Layanan"}</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-700">Pilih Pola Layanan</p>
              <p className="text-xs text-slate-400">Pilih preset agar efek kas/rekening otomatis benar. Anda masih bisa menyesuaikan setelahnya.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SERVICE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={cn("rounded-2xl border-2 p-3 text-left transition-all", f.presetId === preset.id ? "border-primary bg-primary/5 shadow-card" : "border-slate-200 bg-white hover:border-slate-300")}
                >
                  <div className="flex items-start gap-2">
                    <DynamicIcon name={preset.icon} fallback="credit-card" size={18} className={f.presetId === preset.id ? "text-primary" : "text-slate-500"} />
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">{preset.title}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{preset.desc}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-1">{preset.example}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
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
            <div className="space-y-3">
              <CurrencyInput
                label="Biaya Admin yang dibayar pelanggan"
                value={f.adminFee}
                onChange={(value) => setF({ ...f, adminFee: String(value), agentFee: f.profitDifferent ? f.agentFee : String(value) })}
                placeholder="0"
              />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.profitDifferent}
                    onChange={(e) => setF({ ...f, profitDifferent: e.target.checked, agentFee: e.target.checked ? f.agentFee : f.adminFee })}
                    className="w-5 h-5 rounded text-primary focus:ring-primary mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Profit agen berbeda dari biaya admin</p>
                    <p className="text-xs text-slate-400">Default: profit agen otomatis sama dengan biaya admin.</p>
                  </div>
                </label>
                {f.profitDifferent && (
                  <CurrencyInput
                    label="Profit Agen"
                    value={f.agentFee}
                    onChange={(value) => setF({ ...f, agentFee: String(value) })}
                    placeholder="0"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Skema Fee Berjenjang:</p>
                <Button variant="ghost" size="sm" onClick={addTier}><Plus size={14} /> Tambah Tier</Button>
              </div>
              {tiers.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">Belum ada tier. Klik "Tambah Tier" untuk memulai.</p>
              ) : (
                <div className="space-y-2">
                  {tiers.map((tier, idx) => (
                    <div key={idx} className="flex items-end gap-2 bg-slate-50 rounded-xl p-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <CurrencyInput label="Min" value={tier.minAmount} onChange={(value) => updateTier(idx, "minAmount", String(value))} placeholder="0" />
                        <CurrencyInput label="Max" value={tier.maxAmount || ""} onChange={(value) => updateTier(idx, "maxAmount", value ? String(value) : null)} placeholder="Kosong = ∞" />
                        <CurrencyInput label="Biaya Admin" value={tier.adminFee} onChange={(value) => updateTier(idx, "adminFee", String(value))} placeholder="0" />
                      </div>
                      <button onClick={() => removeTier(idx)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400">Profit agen pada tier otomatis mengikuti biaya admin.</p>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Kas Tunai" value={f.cashEffect} onChange={e => setF({ ...f, cashEffect: e.target.value })}>
              <option value="in">Kas masuk / pelanggan bayar cash</option>
              <option value="out">Kas keluar / kasir menyerahkan cash</option>
              <option value="none">Tidak ada perubahan kas</option>
            </Select>
            <Select label="Rekening / M-Banking" value={f.bankEffect} onChange={e => setF({ ...f, bankEffect: e.target.value })}>
              <option value="in">Rekening masuk / terima transfer</option>
              <option value="out">Rekening keluar / transfer atau bayar provider</option>
              <option value="none">Tidak ada perubahan rekening</option>
            </Select>
            <Select label="Jenis Flow" value={f.flowType} onChange={e => setF({ ...f, flowType: e.target.value })}>
              <option value="cash_withdrawal">Tarik Tunai / Cash keluar</option>
              <option value="cash_deposit">Setor Tunai / Cash masuk</option>
              <option value="transfer">Transfer</option>
              <option value="payment">Pembayaran Tagihan</option>
              <option value="topup">Top Up / Pulsa</option>
              <option value="inquiry">Inquiry / Cek Saldo</option>
            </Select>
            <Select label="Cara Admin Dibayar" value={f.defaultFeeMethod} onChange={e => setF({ ...f, defaultFeeMethod: e.target.value })}>
              <option value="cash">Dibayar cash oleh pelanggan</option>
              <option value="charged">Ditambahkan ke transfer/saldo pelanggan</option>
              <option value="deducted">Dipotong dari nominal yang diterima pelanggan</option>
            </Select>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-700">Simulasi Dampak Saldo</p>
              <p className="text-xs text-slate-400">Contoh nominal {formatRupiah(simulationNominal)} dengan admin {formatRupiah(simulationAdminFee || 0)}.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className={cn("rounded-xl p-3", simulationCash.cashDelta < 0 ? "bg-red-50 text-red-700" : simulationCash.cashDelta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600")}>
                <p className="text-[10px] font-bold uppercase opacity-70">Kas Tunai</p>
                <p className="text-lg font-extrabold">{simulationCash.cashDelta > 0 ? "+" : simulationCash.cashDelta < 0 ? "−" : ""}{formatRupiah(Math.abs(simulationCash.cashDelta))}</p>
              </div>
              <div className={cn("rounded-xl p-3", simulationBank.bankDelta < 0 ? "bg-red-50 text-red-700" : simulationBank.bankDelta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600")}>
                <p className="text-[10px] font-bold uppercase opacity-70">Rekening</p>
                <p className="text-lg font-extrabold">{simulationBank.bankDelta > 0 ? "+" : simulationBank.bankDelta < 0 ? "−" : ""}{formatRupiah(Math.abs(simulationBank.bankDelta))}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <p className="text-[10px] font-bold uppercase opacity-70">Profit Agen</p>
                <p className="text-lg font-extrabold">+{formatRupiah(Math.max(0, simulationAgentFee))}</p>
              </div>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700">
            <p className="font-medium mb-1">Panduan Efek Saldo:</p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li><strong>Tarik Tunai:</strong> Cash minus keluar, M-Banking plus masuk</li>
              <li><strong>Transfer/Bayar/Setor:</strong> Cash plus masuk, M-Banking minus keluar</li>
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Pilih Ikon</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto bg-slate-50 rounded-xl p-3">
              {icons.slice(30).map(em => (
                <button key={em} onClick={() => setF({ ...f, icon: em })}
                  className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all", f.icon === em ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-slate-200")}><DynamicIcon name={em} size={18} className="text-slate-700" /></button>
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
      <Modal open={tiersModal} onClose={() => setTiersModal(false)} size="xl">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold flex items-center gap-2">
                <Layers size={20} className="text-purple-500" />
                Atur Fee Berjenjang
              </h3>
              {edit && <p className="text-sm text-slate-500"><DynamicIcon name={edit.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />{edit.name}</p>}
            </div>
            <button onClick={() => setTiersModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700">
            <p className="font-medium">Contoh Skema Fee Tarik Tunai:</p>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li>Rp 0 - 500.000 → Biaya Admin Rp 5.000</li>
              <li>Rp 500.001 - 2.000.000 → Biaya Admin Rp 7.500</li>
              <li>Rp 2.000.001 - 5.000.000 → Biaya Admin Rp 10.000</li>
              <li>&gt; Rp 5.000.000 → Biaya Admin Rp 15.000</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Daftar Tier:</p>
              <Button variant="primary" size="sm" onClick={addTier}><Plus size={14} /> Tambah Tier</Button>
            </div>
            
            {tiers.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Layers size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-slate-400 text-sm">Belum ada tier</p>
                <p className="text-gray-300 text-xs">Klik "Tambah Tier" untuk membuat skema fee berjenjang</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-slate-500 px-2">
                  <span>Nominal Min</span>
                  <span>Nominal Max</span>
                  <span>Biaya Admin</span>
                  <span></span>
                </div>
                {tiers.map((tier, idx) => (
                  <div key={idx} className="flex items-end gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <CurrencyInput label="Min" value={tier.minAmount} onChange={(value) => updateTier(idx, "minAmount", String(value))} placeholder="0" />
                      <CurrencyInput label="Max" value={tier.maxAmount || ""} onChange={(value) => updateTier(idx, "maxAmount", value ? String(value) : null)} placeholder="Kosong = ∞" />
                      <CurrencyInput label="Biaya Admin" value={tier.adminFee} onChange={(value) => updateTier(idx, "adminFee", String(value))} placeholder="0" />
                    </div>
                    <button onClick={() => removeTier(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
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

      <ConfirmDialog
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (confirmDel !== null) {
            await del(confirmDel);
            setConfirmDel(null);
          }
        }}
        title="Hapus Layanan?"
        message="Layanan akan dihapus permanen. Fee berjenjang terkait juga akan dihapus."
        variant="danger"
        confirmText="Hapus"
      />
    </>
  );
}

