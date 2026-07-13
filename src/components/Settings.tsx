"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Spinner } from "@/components/ui";
import { Settings as SettingsIcon, Save, Store, User, Phone, MapPin, CreditCard } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import PrinterSettings from "@/components/PrinterSettings";

export default function SettingsPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5 animate-fadeIn max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
          <SettingsIcon size={24} className="text-zinc-500" /> Pengaturan
        </h2>
        <p className="text-sm text-zinc-400">Konfigurasi toko dan agen BRILink</p>
      </div>

      <Card className="p-6 space-y-5">
        <h3 className="font-semibold text-zinc-700 flex items-center gap-2 border-b border-zinc-100 pb-3">
          <Store size={18} className="text-indigo-500" /> Informasi Toko
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nama Toko"
            value={data.store_name || ""}
            onChange={e => setData({ ...data, store_name: e.target.value })}
            placeholder="Nama toko Anda"
          />
          <Input
            label="ID Agen BRILink"
            value={data.agent_id || ""}
            onChange={e => setData({ ...data, agent_id: e.target.value })}
            placeholder="BRL-xxxx-xxxxx"
          />
        </div>
        <Input
          label="Alamat"
          value={data.store_address || ""}
          onChange={e => setData({ ...data, store_address: e.target.value })}
          placeholder="Alamat lengkap toko"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nama Pemilik"
            value={data.owner_name || ""}
            onChange={e => setData({ ...data, owner_name: e.target.value })}
            placeholder="Nama pemilik"
          />
          <Input
            label="No. Telepon"
            value={data.phone || ""}
            onChange={e => setData({ ...data, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <h3 className="font-semibold text-zinc-700 flex items-center gap-2 border-b border-zinc-100 pb-3">
          <CreditCard size={18} className="text-emerald-500" /> Pengaturan Kas
        </h3>
        <Input
          label="Saldo Awal Default"
          type="number"
          value={data.opening_balance || ""}
          onChange={e => setData({ ...data, opening_balance: e.target.value })}
          placeholder="500000"
        />
        <p className="text-xs text-zinc-400">Saldo awal yang digunakan sebagai referensi pembukaan kas harian.</p>
      </Card>

      <PrinterSettings />

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} size="lg">
          <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
        {saved && (
          <span className="text-emerald-600 text-sm font-medium animate-fadeIn">Berhasil disimpan!</span>
        )}
      </div>
    </div>
  );
}
