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
  Zap,
  Wallet,
  Sparkles,
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
      <div className="min-h-screen flex items-center justify-center gradient-dark" style={{ backgroundColor: "#0F172A" }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center shadow-glow-primary mb-6 animate-float" style={{ backgroundColor: "#00875A" }}>
            <Landmark size={36} className="text-white" />
          </div>
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Kiri: Brand panel (playful gradient) ──── */}
      <div
        className="hidden lg:flex lg:w-1/2 gradient-dark relative overflow-hidden items-center justify-center p-12"
        style={{ backgroundColor: "#0F172A" }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl -mr-32 -mt-32 animate-float" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl -ml-24 -mb-24" />
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl" />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-glow-primary" style={{ backgroundColor: "#00875A" }}>
              <Landmark size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">POS &amp; Agen Bisnis</h1>
              <p className="text-slate-400 text-sm font-medium">Point of Sale &amp; Layanan Agen</p>
            </div>
          </div>

          <h2 className="text-5xl font-extrabold leading-tight mb-4">
            Selamat<br />datang <span className="gradient-text">kembali</span>
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-10">
            Kelola transaksi kasir, layanan agen, stok produk, dan laporan keuangan dalam satu sistem yang cepat &amp; menyenangkan.
          </p>

          <div className="space-y-3">
            {[
              { icon: Zap, text: "Transaksi 3 detik — cepat &amp; mudah" },
              { icon: ShieldCheck, text: "Aman dengan JWT &amp; bcrypt" },
              { icon: Wallet, text: "Multi-rekening &amp; rekening koran instan" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-200">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <f.icon size={18} className="text-emerald-400" />
                </div>
                <span className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: f.text }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanan: Form panel ─────────────────────── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-14 h-14 rounded-3xl gradient-primary flex items-center justify-center shadow-glow-primary" style={{ backgroundColor: "#00875A" }}>
              <Landmark size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">POS &amp; Agen Bisnis</h1>
              <p className="text-slate-400 text-xs font-medium">Point of Sale System</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-float border border-slate-200/50 p-8 animate-bounceIn">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Masuk</h2>
              <p className="text-sm text-slate-400 font-semibold">Silakan masuk dengan akun Anda</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Username</label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    autoFocus
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 active:scale-90 transition-all"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-2xl bg-red-50 border-2 border-red-200/60 text-red-700 text-sm font-bold animate-fadeIn">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl gradient-primary text-white font-extrabold text-base shadow-glow-primary hover:brightness-110 hover:scale-[1.02] transition-all active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                style={{ backgroundColor: "#00875A" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    Masuk <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center font-medium">
                Belum punya akun?{" "}
                <a href="/setup" className="text-primary font-bold hover:underline">
                  Jalankan Setup Wizard
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            © {new Date().getFullYear()} POS &amp; Agen Bisnis
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
        <div className="min-h-screen flex items-center justify-center gradient-dark" style={{ backgroundColor: "#0F172A" }}>
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
