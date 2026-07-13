"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Landmark,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Store,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type Mode = "login" | "setup";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Setup fields
  const [setupName, setSetupName] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");

  useEffect(() => {
    // Bootstrap: panggil /api/seed (idempotent) untuk memastikan admin default ada
    fetch("/api/seed", { method: "POST", cache: "no-store" })
      .catch(() => {})
      .finally(() => {
        // Cek apakah perlu setup wizard (belum ada user sama sekali)
        fetch("/api/auth/setup", { cache: "no-store" })
          .then((r) => r.json())
          .then((data) => {
            if (data.setupNeeded) {
              // Belum ada user — arahkan ke setup wizard
              router.replace("/setup");
              return;
            }
            setMode("login");
            setChecking(false);
          })
          .catch(() => {
            setMode("login");
            setChecking(false);
          });
      });
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal login");
        return;
      }
      const from = params.get("from") || "/";
      router.replace(from);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (setupPassword !== setupConfirm) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    if (setupPassword.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setupName,
          username: setupUsername,
          password: setupPassword,
          role: "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal setup");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary-dark">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Kiri: Brand panel ───────────────────────── */}
      <div className="lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary-dark relative overflow-hidden flex items-center justify-center p-8 lg:p-12">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-light/30 rounded-full blur-3xl -ml-24 -mb-24" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-2xl shadow-accent/40">
              <Landmark size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BRILink POS</h1>
              <p className="text-blue-200 text-sm">Point of Sale & Agen BRILink</p>
            </div>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-4">
            {mode === "login"
              ? "Selamat datang kembali hand"
              : "Setup Akun Admin Pertama key-round"}
          </h2>
          <p className="text-blue-100 text-base leading-relaxed mb-8">
            {mode === "login"
              ? "Masuk untuk mengelola transaksi kasir, layanan BRILink, stok produk, dan laporan keuangan toko Anda dalam satu sistem terintegrasi."
              : "Ini adalah pertama kalinya aplikasi dijalankan. Buat akun admin untuk mengamankan aplikasi Anda sebelum digunakan."}
          </p>

          <div className="space-y-3">
            {[
              { icon: ShieldCheck, text: "Transaksi aman & terlindungi" },
              { icon: Store, text: "Manajemen toko lengkap" },
              { icon: Landmark, text: "Integrasi layanan BRILink" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-50">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <f.icon size={18} className="text-accent" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanan: Form panel ───────────────────────── */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg">
              <Landmark size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">BRILink POS</h1>
              <p className="text-gray-400 text-xs">Point of Sale System</p>
            </div>
          </div>

          {mode === "login" ? (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Masuk</h2>
              <p className="text-sm text-gray-400 mb-6">
                Silakan masuk dengan akun Anda
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    Username
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                      autoFocus
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      required
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fadeIn">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Memproses...
                    </>
                  ) : (
                    <>
                      Masuk <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Belum punya akun?{" "}
                  <a
                    href="/setup"
                    className="text-primary font-semibold hover:underline"
                  >
                    Jalankan Setup Wizard
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-fadeIn">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold uppercase tracking-wider">
                  Setup Awal
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Buat Akun Admin
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Akun ini akan memiliki akses penuh ke seluruh sistem
              </p>

              <form onSubmit={handleSetup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      placeholder="Mis. Ahmad Surya"
                      autoFocus
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    Username
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={setupUsername}
                      onChange={(e) => setSetupUsername(e.target.value)}
                      placeholder="Mis. admin"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={setupConfirm}
                      onChange={(e) => setSetupConfirm(e.target.value)}
                      placeholder="Ulangi password"
                      required
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {setupConfirm && setupPassword === setupConfirm && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 size={12} /> Password cocok
                    </p>
                  )}
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fadeIn">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white font-semibold shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      Buat Akun & Mulai <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Akun admin ini akan memiliki kontrol penuh terhadap
                  pengaturan, produk, dan laporan keuangan.
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} BRILink POS — Sistem Point of Sale
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary-dark">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
