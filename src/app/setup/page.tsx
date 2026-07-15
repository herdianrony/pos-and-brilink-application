"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Store,
  User,
  Lock,
  Wallet,
  Printer,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Wifi,
  Usb,
  Cable,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { validatePasswordPolicy } from "@/lib/security";

type Step = "welcome" | "store" | "admin" | "saldo" | "printer" | "done";

const STEPS: { id: Step; label: string; icon: typeof Store; desc: string }[] = [
  { id: "welcome", label: "Selamat Datang", icon: Sparkles, desc: "Pengenalan" },
  { id: "store", label: "Info Usaha", icon: Store, desc: "Identitas usaha" },
  { id: "admin", label: "Akun Admin", icon: ShieldCheck, desc: "Keamanan login" },
  { id: "saldo", label: "Saldo Awal", icon: Wallet, desc: "Kas + Rekening" },
  { id: "printer", label: "Printer", icon: Printer, desc: "Opsional" },
  { id: "done", label: "Selesai", icon: PartyPopper, desc: "Mulai menggunakan" },
];

function SetupWizardForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Form state ─────────────────────────────────
  // Store
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [ownerWhatsApp, setOwnerWhatsApp] = useState("");
  const [agentId, setAgentId] = useState("");
  const [ownerName, setOwnerName] = useState("");

  // Admin
  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirm, setAdminConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Cash — default 0 (user fills actual opening balance)
  const [openingBalance, setOpeningBalance] = useState("0");

  // Settlement accounts — activate bank/e-wallet templates and set initial balance
  // Format: { [accountId]: { active: boolean, balance: string } }
  const [settlementAccounts, setSettlementAccounts] = useState<Array<{
    id: number;
    code: string;
    name: string;
    icon: string | null;
    color: string | null;
    active: boolean;
    balance: string;
  }>>([]);

  // Printer — default skip (user can configure later)
  const [printerType, setPrinterType] = useState<"network" | "usb" | "serial" | "skip">("skip");
  const [printerHost, setPrinterHost] = useState("192.168.1.87");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerWidth, setPrinterWidth] = useState<"32" | "48">("32");

  useEffect(() => {
    // First-run Electron can land directly on /setup before /login has seeded
    // system templates. Ensure seed runs before checking setup/templates.
    fetch("/api/seed", { method: "POST", cache: "no-store" })
      .catch(() => {})
      .finally(() => {
        // Cek apakah setup diperlukan (belum ada user)
        fetch("/api/auth/setup", { cache: "no-store" })
          .then((r) => r.json())
          .then((data) => {
            if (!data.setupNeeded) {
              // Sudah ada user → redirect ke login
              router.replace("/login");
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, [router]);

  // P0: Load bank/e-wallet templates via setup endpoint (public, no auth needed)
  useEffect(() => {
    if (step === "saldo" && settlementAccounts.length === 0) {
      const loadTemplates = async () => {
        try {
          let res = await fetch("/api/setup/templates", { cache: "no-store" });
          let data: {
            templates: Array<{ id: number; code: string; name: string; icon: string | null; color: string | null; isActive: boolean; balance: string }>;
            cashAccount: { id: number; code: string; name: string; balance: string } | null;
          } | null = res.ok ? await res.json() : null;

          // If templates are empty, seed may not have completed yet. Seed once and retry.
          if (!data || data.templates.length === 0) {
            await fetch("/api/seed", { method: "POST", cache: "no-store" }).catch(() => {});
            res = await fetch("/api/setup/templates", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to load templates");
            data = await res.json();
          }

          if (!data) throw new Error("Template rekening tidak tersedia");

          setSettlementAccounts(data.templates.map(a => ({
            id: a.id,
            code: a.code,
            name: a.name,
            icon: a.icon,
            color: a.color,
            active: false,
            balance: "0",
          })));
        } catch (err) {
          console.error("Failed to load templates:", err);
          setError("Gagal memuat template rekening. Coba kembali ke langkah sebelumnya lalu lanjut lagi.");
        }
      };

      loadTemplates();
    }
  }, [step, settlementAccounts.length]);

  function next() {
    setError("");
    const order: Step[] = ["welcome", "store", "admin", "saldo", "printer", "done"];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) {
      // Validasi per step
      if (step === "store") {
        if (!storeName.trim()) return setError("Nama toko wajib diisi");
        if (!ownerName.trim()) return setError("Nama pemilik wajib diisi");
      }
      if (step === "admin") {
        if (!adminName.trim()) return setError("Nama admin wajib diisi");
        if (!adminUsername.trim()) return setError("Username wajib diisi");
        if (adminUsername.length < 3) return setError("Username minimal 3 karakter");
        const passwordPolicy = validatePasswordPolicy(adminPassword);
        if (!passwordPolicy.ok) return setError(passwordPolicy.error || "Password tidak valid");
        if (adminPassword !== adminConfirm) return setError("Konfirmasi password tidak cocok");
      }
      if (step === "saldo") {
        const n = parseFloat(openingBalance);
        if (isNaN(n) || n < 0) return setError("Saldo awal kas tidak valid");
      }
      setStep(order[idx + 1]);
    }
  }

  function prev() {
    setError("");
    const order: Step[] = ["welcome", "store", "admin", "saldo", "printer", "done"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  }

  async function finish() {
    setSubmitting(true);
    setError("");
    try {
      // Ensure system templates exist before completing setup, especially in Electron first-run.
      await fetch("/api/seed", { method: "POST", cache: "no-store" }).catch(() => {});

      // ── P0: Atomic setup via /api/setup/complete ──
      // Creates admin + settings + cash balance + activates settlement accounts
      // in a single database transaction. If any part fails, everything rolls back.
      const activeSettlements = settlementAccounts.filter(s => s.active);
      const kasOnly = activeSettlements.length === 0;

      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: {
            name: storeName,
            ownerName,
            phone: storePhone,
            ownerWhatsApp,
            address: storeAddress,
            agentId,
          },
          admin: {
            name: adminName,
            username: adminUsername,
            password: adminPassword,
          },
          cashOpeningBalance: parseFloat(openingBalance) || 0,
          settlementAccounts: activeSettlements.map(s => ({
            code: s.code,
            active: true,
            openingBalance: parseFloat(s.balance) || 0,
          })),
          kasOnly,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyelesaikan setup");
        return;
      }

      // Save printer config (jika tidak skip) via Electron API
      if (printerType !== "skip" && typeof window !== "undefined" && window.electronAPI) {
        try {
          await window.electronAPI.printer.saveConfig({
            type: printerType,
            host: printerType === "network" ? printerHost : undefined,
            port: printerType === "network" ? parseInt(printerPort) : undefined,
            width: parseInt(printerWidth) as 32 | 48,
          });
        } catch {
          // Non-fatal — printer bisa setup nanti
        }
      }

      // Move to done step
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark" style={{ backgroundColor: "#0F172A" }}>
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.id === step);
  const progress = ((currentIdx + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* ── Header ─────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md" style={{ backgroundColor: "#00875A" }}>
              <Landmark size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">POS & Agen Bisnis</h1>
              <p className="text-[11px] text-slate-400">Setup Awal Aplikasi</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Langkah {currentIdx + 1} dari {STEPS.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* ── Stepper (desktop) ─────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-6 hidden md:block">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = i < currentIdx;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                        : isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                  </div>
                  <p className={`text-[11px] mt-1.5 font-medium ${isActive ? "text-primary" : isDone ? "text-emerald-600" : "text-slate-400"}`}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all ${i < currentIdx ? "bg-emerald-500" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main content ──────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 pb-32">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 animate-fadeIn min-h-[400px]">
          {step === "welcome" && <WelcomeStep />}
          {step === "store" && (
            <StoreStep
              storeName={storeName}
              setStoreName={setStoreName}
              storeAddress={storeAddress}
              setStoreAddress={setStoreAddress}
              storePhone={storePhone}
              setStorePhone={setStorePhone}
              ownerWhatsApp={ownerWhatsApp}
              setOwnerWhatsApp={setOwnerWhatsApp}
              agentId={agentId}
              setAgentId={setAgentId}
              ownerName={ownerName}
              setOwnerName={setOwnerName}
            />
          )}
          {step === "admin" && (
            <AdminStep
              adminName={adminName}
              setAdminName={setAdminName}
              adminUsername={adminUsername}
              setAdminUsername={setAdminUsername}
              adminPassword={adminPassword}
              setAdminPassword={setAdminPassword}
              adminConfirm={adminConfirm}
              setAdminConfirm={setAdminConfirm}
              showPwd={showPwd}
              setShowPwd={setShowPwd}
            />
          )}
          {step === "saldo" && (
            <SaldoStep
              openingBalance={openingBalance}
              setOpeningBalance={setOpeningBalance}
              accounts={settlementAccounts}
              setAccounts={setSettlementAccounts}
            />
          )}
          {step === "printer" && (
            <PrinterStep
              printerType={printerType}
              setPrinterType={setPrinterType}
              printerHost={printerHost}
              setPrinterHost={setPrinterHost}
              printerPort={printerPort}
              setPrinterPort={setPrinterPort}
              printerWidth={printerWidth}
              setPrinterWidth={setPrinterWidth}
            />
          )}
          {step === "done" && <DoneStep storeName={storeName} adminName={adminName} />}

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fadeIn">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer navigation ─────────────────── */}
      {step !== "welcome" && step !== "done" && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={prev}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={16} /> Kembali
            </button>
            {step === "printer" ? (
              <button
                onClick={finish}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Selesaikan Setup
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={next}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2"
              >
                Lanjut <ArrowRight size={16} />
              </button>
            )}
          </div>
        </footer>
      )}

      {step === "done" && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-center">
            <button
              onClick={() => {
                router.replace("/");
                router.refresh();
              }}
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2"
            >
              <Sparkles size={18} /> Mulai Menggunakan Aplikasi
            </button>
          </div>
        </footer>
      )}

      {/* Hidden button for welcome step — show "Mulai" instead of "Lanjut" */}
      {step === "welcome" && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-end gap-3">
            <button
              onClick={next}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 text-sm flex items-center gap-2"
            >
              Mulai Setup <ArrowRight size={18} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

// ── Step Components ──────────────────────────────

function WelcomeStep() {
  return (
    <div className="text-center py-6">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-2xl shadow-primary/30 mb-6" style={{ backgroundColor: "#00875A" }}>
        <Landmark size={40} className="text-white" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
        Selamat Datang di POS & Agen Bisnis
      </h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
        Aplikasi Point of Sale & agen bisnis lengkap dengan manajemen produk,
        kas, dan transaksi. Mari setup aplikasi Anda dalam beberapa langkah.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
        {[
          { icon: Store, title: "Info Toko", desc: "Identitas usaha" },
          { icon: ShieldCheck, title: "Akun Aman", desc: "Login & otoritas" },
          { icon: Wallet, title: "Kas Siap", desc: "Saldo awal" },
        ].map((f, i) => (
          <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 mx-auto rounded-xl bg-white flex items-center justify-center shadow-sm mb-2">
              <f.icon size={18} className="text-primary" />
            </div>
            <p className="text-sm font-bold text-slate-700">{f.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-8">Setup membutuhkan sekitar 2-3 menit
      </p>
    </div>
  );
}

function StoreStep({
  storeName, setStoreName,
  storeAddress, setStoreAddress,
  storePhone, setStorePhone,
  ownerWhatsApp, setOwnerWhatsApp,
  agentId, setAgentId,
  ownerName, setOwnerName,
}: {
  storeName: string; setStoreName: (v: string) => void;
  storeAddress: string; setStoreAddress: (v: string) => void;
  storePhone: string; setStorePhone: (v: string) => void;
  ownerWhatsApp: string; setOwnerWhatsApp: (v: string) => void;
  agentId: string; setAgentId: (v: string) => void;
  ownerName: string; setOwnerName: (v: string) => void;
}) {
  return (
    <div>
      <StepHeader
        icon={Store}
        title="Informasi Toko"
        desc="Data ini akan tampil di struk transaksi dan laporan"
      />
      <div className="space-y-4 mt-6">
        <Field label="Nama Toko" required>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Mis. Toko Maju Jaya"
            className="wizard-input"
            autoFocus
          />
        </Field>
        <Field label="Nama Pemilik" required>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Mis. Ahmad Surya"
            className="wizard-input"
          />
        </Field>
        <Field label="Alamat">
          <input
            type="text"
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            placeholder="Jl. Raya No. 123, Jakarta"
            className="wizard-input"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="No. Telepon Toko">
            <input
              type="tel"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="wizard-input"
            />
          </Field>
          <Field label="WhatsApp Owner" hint="Untuk notifikasi cek transfer">
            <input
              type="tel"
              value={ownerWhatsApp}
              onChange={(e) => setOwnerWhatsApp(e.target.value)}
              placeholder="081234567890"
              className="wizard-input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ID Agen / Kode Bisnis">
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="Mis. BRL-xxxx-xxxxx (opsional)"
              className="wizard-input"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function AdminStep({
  adminName, setAdminName,
  adminUsername, setAdminUsername,
  adminPassword, setAdminPassword,
  adminConfirm, setAdminConfirm,
  showPwd, setShowPwd,
}: {
  adminName: string; setAdminName: (v: string) => void;
  adminUsername: string; setAdminUsername: (v: string) => void;
  adminPassword: string; setAdminPassword: (v: string) => void;
  adminConfirm: string; setAdminConfirm: (v: string) => void;
  showPwd: boolean; setShowPwd: (v: boolean) => void;
}) {
  return (
    <div>
      <StepHeader
        icon={ShieldCheck}
        title="Akun Administrator"
        desc="Akun ini memiliki akses penuh ke seluruh fitur aplikasi"
      />
      <div className="space-y-4 mt-6">
        <Field label="Nama Lengkap Admin" required>
          <input
            type="text"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Mis. Ahmad Surya"
            className="wizard-input"
            autoFocus
          />
        </Field>
        <Field label="Username" required>
          <input
            type="text"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            placeholder="Mis. admin"
            className="wizard-input"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>
        <Field label="Password" required hint="Minimal 6 karakter">
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••"
              className="wizard-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <Field label="Konfirmasi Password" required>
          <input
            type={showPwd ? "text" : "password"}
            value={adminConfirm}
            onChange={(e) => setAdminConfirm(e.target.value)}
            placeholder="••••••"
            className="wizard-input"
          />
        </Field>
        {adminConfirm && adminPassword === adminConfirm && adminPassword.length >= 6 && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <CheckCircle2 size={14} /> Password cocok & valid
          </div>
        )}
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
          <strong>Penting:</strong> Simpan username & password di tempat aman.
          Jika lupa, Anda perlu reset database untuk mengembalikan akses.
        </div>
      </div>
    </div>
  );
}

// ── P1: Merged SaldoStep (Kas Awal + Rekening Settlement) ──
function SaldoStep({
  openingBalance,
  setOpeningBalance,
  accounts,
  setAccounts,
}: {
  openingBalance: string;
  setOpeningBalance: (v: string) => void;
  accounts: Array<{
    id: number;
    code: string;
    name: string;
    icon: string | null;
    color: string | null;
    active: boolean;
    balance: string;
  }>;
  setAccounts: (accs: Array<{
    id: number;
    code: string;
    name: string;
    icon: string | null;
    color: string | null;
    active: boolean;
    balance: string;
  }>) => void;
}) {
  const presetOptions = [
    { label: "Rp 100.000", value: "100000" },
    { label: "Rp 200.000", value: "200000" },
    { label: "Rp 500.000", value: "500000" },
    { label: "Rp 1.000.000", value: "1000000" },
  ];

  function toggleActive(id: number) {
    setAccounts(accounts.map(a => a.id === id ? { ...a, active: !a.active } : a));
  }
  function setBalance(id: number, balance: string) {
    setAccounts(accounts.map(a => a.id === id ? { ...a, balance } : a));
  }

  const activeCount = accounts.filter(a => a.active).length;

  return (
    <div>
      <StepHeader
        icon={Wallet}
        title="Saldo Awal"
        desc="Isi saldo awal kas tunai dan pilih rekening settlement yang aktif untuk transaksi transfer, setor, dan pembayaran."
      />

      <div className="space-y-6 mt-6">
        {/* ── Kas Tunai ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-emerald-500" />
            <h4 className="font-bold text-slate-800">Kas Tunai (Laci)</h4>
          </div>
          <CurrencyInput
            value={openingBalance}
            onChange={(v) => setOpeningBalance(String(v))}
            placeholder="0"
            autoFocus
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presetOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOpeningBalance(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  openingBalance === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Rekening Settlement ── */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark size={18} className="text-blue-500" />
              <h4 className="font-bold text-slate-800">Rekening Settlement</h4>
            </div>
            {activeCount > 0 && (
              <span className="text-xs font-medium text-emerald-600">{activeCount} aktif</span>
            )}
          </div>

          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Memuat rekening...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    acc.active ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={acc.active}
                        onChange={() => toggleActive(acc.id)}
                        className="w-5 h-5 rounded text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate text-sm">{acc.name}</p>
                        <p className="text-xs text-slate-400">{acc.code}</p>
                      </div>
                    </div>
                    {acc.active && (
                      <div className="w-40">
                        <CurrencyInput
                          value={acc.balance}
                          onChange={(v) => setBalance(acc.id, String(v))}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Kas-only warning */}
          {activeCount === 0 && accounts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-semibold">Mulai dengan Kas Saja</p>
              <p className="mt-0.5">Layanan transfer, setor tunai, dan pembayaran tagihan belum bisa dipakai. Anda bisa menambahkan rekening settlement nanti di menu Kas & Saldo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrinterStep({
  printerType, setPrinterType,
  printerHost, setPrinterHost,
  printerPort, setPrinterPort,
  printerWidth, setPrinterWidth,
}: {
  printerType: "network" | "usb" | "serial" | "skip";
  setPrinterType: (v: "network" | "usb" | "serial" | "skip") => void;
  printerHost: string; setPrinterHost: (v: string) => void;
  printerPort: string; setPrinterPort: (v: string) => void;
  printerWidth: "32" | "48"; setPrinterWidth: (v: "32" | "48") => void;
}) {
  const options = [
    { id: "network" as const, icon: Wifi, label: "Network (LAN/WiFi)", desc: "Paling stabil, recommended", color: "blue" },
    { id: "usb" as const, icon: Usb, label: "USB", desc: "Langsung dari kabel USB", color: "purple" },
    { id: "serial" as const, icon: Cable, label: "Serial (COM)", desc: "Printer lama RS232", color: "amber" },
    { id: "skip" as const, icon: ArrowRight, label: "Lewati", desc: "Setup nanti di Pengaturan", color: "gray" },
  ];
  return (
    <div>
      <StepHeader
        icon={Printer}
        title="Setup Printer Thermal"
        desc="Cetak struk transaksi otomatis. Opsional — bisa skip & setup nanti."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = printerType === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setPrinterType(opt.id)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isActive ? "text-primary" : "text-slate-700"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </div>
                {isActive && <CheckCircle2 size={16} className="text-primary shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {printerType === "network" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 animate-fadeIn">
          <div className="sm:col-span-2">
            <Field label="IP Address Printer">
              <input
                type="text"
                value={printerHost}
                onChange={(e) => setPrinterHost(e.target.value)}
                placeholder="192.168.1.87"
                className="wizard-input"
              />
            </Field>
          </div>
          <Field label="Port">
            <input
              type="number"
              value={printerPort}
              onChange={(e) => setPrinterPort(e.target.value)}
              placeholder="9100"
              className="wizard-input"
            />
          </Field>
        </div>
      )}

      {printerType !== "skip" && (
        <div className="mt-5 animate-fadeIn">
          <Field label="Lebar Kertas">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPrinterWidth("32")}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  printerWidth === "32" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600"
                }`}
              >
                58mm (32 char)
              </button>
              <button
                onClick={() => setPrinterWidth("48")}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  printerWidth === "48" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600"
                }`}
              >
                80mm (48 char)
              </button>
            </div>
          </Field>
        </div>
      )}

      {printerType === "skip" && (
        <div className="mt-5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">Anda bisa setup printer nanti di menu <strong>Pengaturan → Printer Thermal</strong>
        </div>
      )}
    </div>
  );
}

function DoneStep({ storeName, adminName }: { storeName: string; adminName: string }) {
  return (
    <div className="text-center py-6">
      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6 animate-scaleIn">
        <PartyPopper size={42} className="text-white" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
        Setup Selesai! party-popper
      </h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        Selamat! Aplikasi POS & Agen Bisnis siap digunakan. Anda sudah login sebagai
        admin dan dapat mulai bertransaksi.
      </p>

      <div className="max-w-sm mx-auto space-y-3 text-left">
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Toko: {storeName || "—"}</p>
            <p className="text-xs text-emerald-600">Identitas usaha tersimpan</p>
          </div>
        </div>
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Admin: {adminName || "—"}</p>
            <p className="text-xs text-emerald-600">Akun siap, Anda sudah login</p>
          </div>
        </div>
        <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-3">
          <Wallet size={20} className="text-purple-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Kas Awal Diset</p>
            <p className="text-xs text-purple-600">Saldo awal tercatat</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        Klik tombol di bawah untuk masuk ke Dashboard
      </p>
    </div>
  );
}

// ── Reusable sub-components ──────────────────────

function StepHeader({ icon: Icon, title, desc }: { icon: typeof Store; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 mb-2">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md shrink-0" style={{ backgroundColor: "#00875A" }}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-xs text-slate-400 font-normal ml-auto">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gradient-dark" style={{ backgroundColor: "#0F172A" }}>
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <SetupWizardForm />
    </Suspense>
  );
}
