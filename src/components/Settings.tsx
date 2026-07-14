"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Input, Spinner, Tabs, Badge, useToast } from "@/components/ui";
import { Settings as SettingsIcon, Save, Store, Phone, MapPin, CreditCard, ShieldCheck, Printer, AlertTriangle, ChevronDown, ChevronUp, Check } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import PrinterSettings from "@/components/PrinterSettings";
import UserManagement from "@/components/UserManagement";
import { updateSettings } from "@/lib/use-settings";

type SettingsTab = "profil" | "transaksi" | "printer" | "pengguna" | "lanjutan";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profil");
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // which section is saving
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const toast = useToast();

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setData({
        app_name: "POS & Agen Bisnis",
        business_type: "Agen Bisnis",
        services_label: "Layanan Agen",
        ...d,
      });
      setLoading(false);
    });
  }, []);

  function update(key: string, value: string, section: string) {
    setData(prev => ({ ...prev, [key]: value }));
    setDirty(prev => ({ ...prev, [section]: true }));
  }

  async function saveSection(section: string, keys: string[]) {
    setSaving(section);
    try {
      const sectionData: Record<string, string> = {};
      for (const k of keys) sectionData[k] = data[k] || "";

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionData),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Gagal menyimpan");
        return;
      }
      await updateSettings(data);
      setSavedAt(prev => ({ ...prev, [section]: Date.now() }));
      setDirty(prev => ({ ...prev, [section]: false }));
      toast.success("Pengaturan berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(null);
    }
  }

  const formatSavedTime = (ts?: number) => {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <SettingsIcon size={24} className="text-slate-500" /> Pengaturan
        </h2>
        <p className="text-sm text-slate-400">Konfigurasi bisnis, transaksi, dan aplikasi</p>
      </div>

      {/* Tab navigation */}
      <Tabs
        tabs={[
          { id: "profil", label: "Profil Usaha", icon: "store" },
          { id: "transaksi", label: "Transaksi & Settlement", icon: "credit-card" },
          { id: "printer", label: "Printer & Struk", icon: "printer" },
          { id: "pengguna", label: "Pengguna", icon: "users" },
          { id: "lanjutan", label: "Lanjutan", icon: "alert-triangle" },
        ]}
        active={activeTab}
        onChange={(t) => setActiveTab(t as SettingsTab)}
      />

      {/* ══════ TAB: Profil Usaha ══════ */}
      {activeTab === "profil" && (
        <div className="space-y-5">
          {/* Informasi Toko */}
          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<Store size={18} className="text-emerald-500" />}
              title="Informasi Usaha"
              desc="Data ini akan muncul pada struk dan laporan."
              dirty={dirty.profil}
              savedAt={formatSavedTime(savedAt.profil)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Toko" value={data.store_name || ""} onChange={e => update("store_name", e.target.value, "profil")} placeholder="Nama toko Anda" />
              <Input label="ID Agen / Kode Bisnis" value={data.agent_id || ""} onChange={e => update("agent_id", e.target.value, "profil")} placeholder="Mis. BRL-xxxx (opsional)" />
            </div>
            <Input label="Alamat" value={data.store_address || ""} onChange={e => update("store_address", e.target.value, "profil")} placeholder="Alamat lengkap toko" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Pemilik" value={data.owner_name || ""} onChange={e => update("owner_name", e.target.value, "profil")} placeholder="Nama pemilik" />
              <Input label="No. Telepon" value={data.phone || ""} onChange={e => update("phone", e.target.value, "profil")} placeholder="08xxxxxxxxxx" />
            </div>
            <SaveButton
              saving={saving === "profil"}
              dirty={dirty.profil}
              savedAt={formatSavedTime(savedAt.profil)}
              onClick={() => saveSection("profil", ["store_name", "store_address", "agent_id", "owner_name", "phone"])}
              label="Simpan Informasi Usaha"
            />
          </Card>

          {/* Branding */}
          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<CreditCard size={18} className="text-purple-500" />}
              title="Branding (Opsional)"
              desc="Tampilan nama aplikasi dan menu. Biarkan default jika tidak perlu."
              dirty={dirty.branding}
              savedAt={formatSavedTime(savedAt.branding)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Aplikasi" value={data.app_name || ""} onChange={e => update("app_name", e.target.value, "branding")} placeholder="POS & Agen Bisnis" />
              <Input label="Label Menu Layanan" value={data.services_label || ""} onChange={e => update("services_label", e.target.value, "branding")} placeholder="Layanan Agen" />
            </div>
            <SaveButton
              saving={saving === "branding"}
              dirty={dirty.branding}
              savedAt={formatSavedTime(savedAt.branding)}
              onClick={() => saveSection("branding", ["app_name", "services_label"])}
              label="Simpan Branding"
            />
          </Card>
        </div>
      )}

      {/* ══════ TAB: Transaksi & Settlement ══════ */}
      {activeTab === "transaksi" && (
        <div className="space-y-5">
          {/* Aturan Pencatatan */}
          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<ShieldCheck size={18} className="text-blue-500" />}
              title="Aturan Pencatatan"
              desc="Kontrol bagaimana transaksi dicatat dan dikonfirmasi."
              dirty={dirty.policy}
              savedAt={formatSavedTime(savedAt.policy)}
            />
            <div className="space-y-3">
              <ToggleRow
                label="Wajib konfirmasi uang fisik"
                desc="Kasir harus konfirmasi sebelum transaksi tunai disimpan."
                checked={data.require_cash_confirmation === "true"}
                onChange={(v) => update("require_cash_confirmation", v ? "true" : "false", "policy")}
              />
              <ToggleRow
                label="Wajib nomor referensi untuk transfer/pembayaran"
                desc="Transaksi external provider wajib diisi nomor referensi saat diselesaikan."
                checked={data.require_transaction_reference === "true"}
                onChange={(v) => update("require_transaction_reference", v ? "true" : "false", "policy")}
              />
              <ToggleRow
                label="Transfer/pembayaran dibuat sebagai Pending"
                desc="Transaksi external provider dibuat dengan status 'pending' hingga dikonfirmasi."
                checked={data.default_service_status === "recorded" || data.default_service_status === "pending"}
                onChange={(v) => update("default_service_status", v ? "recorded" : "completed", "policy")}
              />
            </div>
            <SaveButton
              saving={saving === "policy"}
              dirty={dirty.policy}
              savedAt={formatSavedTime(savedAt.policy)}
              onClick={() => saveSection("policy", ["require_cash_confirmation", "require_transaction_reference", "default_service_status"])}
              label="Simpan Aturan Pencatatan"
            />
          </Card>

          {/* Policy Diskon */}
          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<CreditCard size={18} className="text-amber-500" />}
              title="Policy Diskon"
              desc="Batasan diskon POS dan otorisasi PIN admin."
              dirty={dirty.discount}
              savedAt={formatSavedTime(savedAt.discount)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Maksimal Diskon Nominal (Rp)"
                type="number"
                value={data.max_discount_amount || "100000"}
                onChange={e => update("max_discount_amount", e.target.value, "discount")}
                placeholder="100000"
              />
              <Input
                label="Maksimal Diskon Persentase (%)"
                type="number"
                value={data.max_discount_percent || "10"}
                onChange={e => update("max_discount_percent", e.target.value, "discount")}
                placeholder="10"
              />
            </div>
            <Input
              label="PIN Otorisasi Diskon Besar"
              type="password"
              value={data.discount_admin_pin ? "****" : ""}
              onChange={e => update("discount_admin_pin", e.target.value, "discount")}
              placeholder="Kosongkan jika tidak ada PIN"
            />
            <p className="text-xs text-slate-400">
              Diskon di atas batas nominal/persentase atau diskon 100% wajib PIN admin.
              Masukkan PIN baru untuk mengganti, atau biarkan **** untuk mempertahankan.
            </p>
            <SaveButton
              saving={saving === "discount"}
              dirty={dirty.discount}
              savedAt={formatSavedTime(savedAt.discount)}
              onClick={() => saveSection("discount", ["max_discount_amount", "max_discount_percent", "discount_admin_pin"])}
              label="Simpan Policy Diskon"
            />
          </Card>

          {/* Rekening Settlement Info */}
          <Card className="p-5 space-y-3">
            <SectionHeader
              icon={<Store size={18} className="text-emerald-500" />}
              title="Rekening Settlement"
              desc="Kelola rekening bank/e-wallet aktif untuk transaksi."
            />
            <p className="text-sm text-slate-600">
              Rekening settlement dikelola di halaman <strong>Kas & Saldo</strong>.
              Anda bisa menambah, mengaktifkan, menonaktifkan, dan mengatur saldo rekening di sana.
            </p>
            <Button variant="secondary" size="sm" onClick={() => window.location.hash = "cash"}>
              Kelola Rekening & Saldo
            </Button>
          </Card>

          {/* Info: Opening Balance */}
          <Card className="p-4 bg-amber-50 border-amber-100">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">Saldo Kas</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Saldo kas nyata dikelola di menu <strong>Kas & Saldo</strong> melalui fitur "Sesuaikan".
                  Pengaturan opening_balance di sini hanya referensi setup awal dan tidak mengubah saldo aktual.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══════ TAB: Printer & Struk ══════ */}
      {activeTab === "printer" && (
        <PrinterSettings />
      )}

      {/* ══════ TAB: Pengguna ══════ */}
      {activeTab === "pengguna" && (
        <UserManagement />
      )}

      {/* ══════ TAB: Lanjutan ══════ */}
      {activeTab === "lanjutan" && (
        <div className="space-y-5">
          {/* Data Management */}
          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<AlertTriangle size={18} className="text-amber-500" />}
              title="Manajemen Data"
              desc="Backup, restore, dan reset data aplikasi."
            />
            <div className="space-y-2">
              <Button variant="secondary" size="sm" disabled>
                Export Backup Database
              </Button>
              <p className="text-xs text-slate-400">Fitur backup akan tersedia di versi mendatang.</p>
            </div>
          </Card>

          {/* Demo Data */}
          <Card className="p-5 space-y-4 border-red-200">
            <SectionHeader
              icon={<AlertTriangle size={18} className="text-red-500" />}
              title="Danger Zone"
              desc="Tindakan berisiko tinggi. Tidak dapat dibatalkan."
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Reset Demo Data</p>
                  <p className="text-xs text-slate-400">Hapus produk contoh dan fee tier demo.</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Hapus semua data demo? Data user tidak terpengaruh.")) return;
                    const res = await fetch("/api/seed-demo", { method: "DELETE" });
                    const d = await res.json();
                    if (res.ok) toast.success("Demo data dihapus");
                    else toast.error(d.error || "Gagal menghapus demo data");
                  }}
                >
                  Hapus Demo
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Helper Components ─────────────────────────────

function SectionHeader({ icon, title, desc, dirty, savedAt }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  dirty?: boolean;
  savedAt?: string | null;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-extrabold text-slate-700">{title}</h3>
        {dirty && <Badge variant="warning">Belum disimpan</Badge>}
        {savedAt && !dirty && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check size={10} /> Tersimpan {savedAt}</span>}
      </div>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
  );
}

function SaveButton({ saving, dirty, savedAt, onClick, label }: {
  saving: boolean;
  dirty?: boolean;
  savedAt?: string | null;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button onClick={onClick} disabled={saving || !dirty} size="sm">
        <Save size={14} /> {saving ? "Menyimpan..." : label}
      </Button>
      {savedAt && !dirty && <span className="text-xs text-emerald-600">✓ Tersimpan {savedAt}</span>}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded text-primary focus:ring-primary mt-0.5"
      />
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </label>
  );
}
