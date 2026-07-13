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
  Zap,
  Wallet,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetch("/api/seed", { method: "POST", cache: "no-store" })
      .catch(() => {})
      .finally(() => {
        fetch("/api/auth/setup", { cache: "no-store" })
          .then((r) => r.json())
          .then((data) => {
            if (data.setupNeeded) {
              router.replace("/setup");
              return;
            }
            setChecking(false);
          })
          .catch(() => setChecking(false));
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

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-darker via-primary to-primary-dark">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Kiri: Brand panel ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-darker via-primary to-primary-dark relative overflow-hidden items-center justify-center p-12">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-light/40 rounded-full blur-3xl -ml-24 -mb-24" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-glow-accent">
              <Landmark size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">BRILink POS</h1>
              <p className="text-indigo-200 text-sm">Point of Sale & Agen BRILink</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Selamat datang kembali
          </h2>
          <p className="text-indigo-100 text-base leading-relaxed mb-10">
            Masuk untuk mengelola transaksi kasir, layanan BRILink, stok produk, dan laporan keuangan toko Anda dalam satu sistem terintegrasi.
          </p>

          <div className="space-y-3">
            {[
              { icon: ShieldCheck, text: "Transaksi aman & terlindungi" },
              { icon: Store, text: "Manajemen toko lengkap" },
              { icon: Landmark, text: "Integrasi layanan BRILink" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-indigo-50">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <f.icon size={18} className="text-accent-light" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanan: Form panel ─────────────────────── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-zinc-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-glow-primary">
              <Landmark size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">BRILink POS</h1>
              <p className="text-zinc-400 text-xs">Point of Sale System</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-pop border border-zinc-200/60 p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-zinc-900 mb-1">Masuk</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Silakan masuk dengan akun Anda
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Username</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    autoFocus
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-sm font-medium animate-fadeIn">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold shadow-glow-primary hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
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

            <div className="mt-6 pt-6 border-t border-zinc-100">
              <p className="text-xs text-zinc-400 text-center leading-relaxed">
                Belum punya akun?{" "}
                <a href="/setup" className="text-primary font-semibold hover:underline">
                  Jalankan Setup Wizard
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-6">
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-darker via-primary to-primary-dark">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
