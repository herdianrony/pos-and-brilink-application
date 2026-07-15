"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Input, Spinner, Tabs, Badge, useToast } from "@/components/ui";
import { Settings as SettingsIcon, Save, Store, CreditCard, ShieldCheck, AlertTriangle, Check, MessageCircle, LogOut, RefreshCw, QrCode } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import PrinterSettings from "@/components/PrinterSettings";
import UserManagement from "@/components/UserManagement";
import { updateSettings } from "@/lib/use-settings";

type SettingsTab = "profil" | "transaksi" | "whatsapp" | "printer" | "pengguna" | "lanjutan";

interface WhatsAppStatus {
  status: string;
  qrDataUrl: string | null;
  lastError: string | null;
  enabled: boolean;
  autoNotifyOwner: boolean;
  ownerNumber: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profil");
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // which section is saving
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [waLoading, setWaLoading] = useState(false);
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

  useEffect(() => {
    if (activeTab === "whatsapp") refreshWhatsAppStatus();
  }, [activeTab]);

  async function refreshWhatsAppStatus() {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      if (res.ok) setWaStatus(await res.json());
    } catch {
      // ignore status refresh failures
    }
  }

  async function startWhatsApp() {
    setWaLoading(true);
    try {
      const res = await fetch("/api/whatsapp/start", { method: "POST" });
      const data = await res.json();
      setWaStatus(data);
      if (data.status === "ready") toast.success("WhatsApp terhubung");
      else if (data.qrDataUrl) toast.info("Scan QR WhatsApp untuk menghubungkan");
      else if (data.lastError) toast.error(data.lastError);
    } catch {
      toast.error("Gagal memulai WhatsApp");
    } finally {
      setWaLoading(false);
    }
  }

  async function logoutWhatsApp() {
    setWaLoading(true);
    try {
      const res = await fetch("/api/whatsapp/logout", { method: "POST" });
      if (res.ok) setWaStatus(await res.json());
      toast.success("WhatsApp berhasil logout");
    } catch {
      toast.error("Gagal logout WhatsApp");
    } finally {
      setWaLoading(false);
    }
  }

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
          { id: "whatsapp", label: "WhatsApp Owner", icon: "message-circle" },
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
              label={data.discount_admin_pin_set === "true" ? "PIN Otorisasi Diskon (sudah diset — kosongkan untuk pertahankan)" : "PIN Otorisasi Diskon Besar"}
              type="password"
              value={data.discount_admin_pin || ""}
              onChange={e => update("discount_admin_pin", e.target.value, "discount")}
              placeholder={data.discount_admin_pin_set === "true" ? "•••••• (biarkan kosong untuk tidak ubah)" : "Kosongkan jika tidak ada PIN"}
            />
            <p className="text-xs text-slate-400">
              Diskon di atas batas nominal/persentase atau diskon 100% wajib PIN admin.
              {data.discount_admin_pin_set === "true" ? " PIN sudah diset. Kosongkan field untuk mempertahankan PIN yang ada." : " Masukkan PIN baru untuk mengaktifkan."}
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

      {/* ══════ TAB: WhatsApp Owner ══════ */}
      {activeTab === "whatsapp" && (
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<MessageCircle size={18} className="text-emerald-500" />}
              title="Notifikasi WhatsApp Owner"
              desc="Kirim notifikasi otomatis ke owner untuk transaksi yang perlu dicek/proses via m-banking atau provider."
              dirty={dirty.whatsapp}
              savedAt={formatSavedTime(savedAt.whatsapp)}
            />
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Gunakan nomor WhatsApp kasir/operasional untuk scan QR. Fitur ini memakai WhatsApp Web otomatis, jadi jangan dipakai untuk spam/broadcast massal.
            </div>
            <ToggleRow
              label="Aktifkan WhatsApp Owner"
              desc="Jika aktif, aplikasi dapat mengirim pesan WhatsApp otomatis saat transaksi tertentu dicatat."
              checked={data.whatsapp_enabled === "true"}
              onChange={(v) => update("whatsapp_enabled", v ? "true" : "false", "whatsapp")}
            />
            <ToggleRow
              label="Kirim otomatis setelah transaksi layanan agen"
              desc="Tarik Tunai, Transfer, Setor, Pembayaran, dan Top Up akan mengirim notifikasi ke owner jika WhatsApp siap."
              checked={data.whatsapp_auto_notify_owner === "true"}
              onChange={(v) => update("whatsapp_auto_notify_owner", v ? "true" : "false", "whatsapp")}
            />
            <Input
              label="Nomor WhatsApp Owner"
              value={data.whatsapp_owner_number || ""}
              onChange={e => update("whatsapp_owner_number", e.target.value, "whatsapp")}
              placeholder="081234567890"
            />
            <SaveButton
              saving={saving === "whatsapp"}
              dirty={dirty.whatsapp}
              savedAt={formatSavedTime(savedAt.whatsapp)}
              onClick={() => saveSection("whatsapp", ["whatsapp_enabled", "whatsapp_auto_notify_owner", "whatsapp_owner_number"])}
              label="Simpan Pengaturan WhatsApp"
            />
          </Card>

          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<QrCode size={18} className="text-blue-500" />}
              title="Koneksi WhatsApp Kasir"
              desc="Scan QR dengan WhatsApp kasir/operasional. Session tersimpan lokal dan bisa logout kapan saja."
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={waStatus?.status === "ready" ? "success" : waStatus?.status === "qr" ? "warning" : waStatus?.status === "error" ? "danger" : "default"}>
                Status: {waStatus?.status || "idle"}
              </Badge>
              {waStatus?.lastError && <span className="text-xs text-red-600">{waStatus.lastError}</span>}
            </div>
            {waStatus?.qrDataUrl && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <img src={waStatus.qrDataUrl} alt="QR WhatsApp" className="h-64 w-64 rounded-xl bg-white p-2" />
                <p className="text-xs text-slate-500 text-center">Buka WhatsApp kasir → Perangkat tertaut → Tautkan perangkat → scan QR ini.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={startWhatsApp} disabled={waLoading}>
                <MessageCircle size={14} /> {waLoading ? "Memproses..." : "Mulai / Tampilkan QR"}
              </Button>
              <Button variant="secondary" size="sm" onClick={refreshWhatsAppStatus} disabled={waLoading}>
                <RefreshCw size={14} /> Refresh Status
              </Button>
              <Button variant="danger" size="sm" onClick={logoutWhatsApp} disabled={waLoading}>
                <LogOut size={14} /> Logout WhatsApp
              </Button>
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
          {/* Backup & Restore */}
          <Card className="p-5 space-y-4">
            <SectionHeader
              icon={<AlertTriangle size={18} className="text-blue-500" />}
              title="Backup & Restore Database"
              desc="Download backup database SQLite atau restore dari file backup."
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Export Backup</p>
                  <p className="text-xs text-slate-400">Download seluruh database dalam format .db</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/backup");
                      if (!res.ok) { toast.error("Gagal export backup"); return; }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Backup berhasil diunduh");
                    } catch { toast.error("Gagal export backup"); }
                  }}
                >
                  Download Backup
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Restore Database</p>
                  <p className="text-xs text-slate-400">Restore dari file backup .db. Database saat ini akan ditimpa.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".db,.sqlite,.sqlite3"
                    id="restore-file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!confirm("Restore database akan MENGGANTI semua data saat ini. Lanjutkan?")) return;
                      try {
                        const res = await fetch("/api/backup", { method: "POST", body: file });
                        const d = await res.json();
                        if (res.ok) toast.success("Database berhasil di-restore. Mulai ulang aplikasi.");
                        else toast.error(d.error || "Gagal restore");
                      } catch { toast.error("Gagal restore database"); }
                    }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => document.getElementById("restore-file")?.click()}>
                    Upload & Restore
                  </Button>
                </div>
              </div>
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
