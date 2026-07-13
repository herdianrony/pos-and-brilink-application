"use client";

import { useEffect, useState } from "react";
import {
  Landmark,
  Heart,
  Mail,
  ExternalLink,
  Code2,
  Sparkles,
  Coffee,
  Users,
  Star,
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Printer,
  Zap,
  Globe,
} from "lucide-react";
import { getAppVersion, isElectron, isPackaged } from "@/lib/hardware";
import { useSettings } from "@/lib/use-settings";

export default function AboutPage() {
  const [version, setVersion] = useState("1.0.0");
  const [electron, setElectron] = useState(false);
  const [packaged, setPackaged] = useState(false);
  const { settings } = useSettings();

  const appName = settings.app_name || "POS & Agen Bisnis";
  const businessType = settings.business_type || "Agen Bisnis";

  useEffect(() => {
    (async () => {
      setVersion(await getAppVersion());
      setElectron(isElectron());
      setPackaged(await isPackaged());
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* ── Header ─────────────────────────────── */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} /> Kembali
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
              <Landmark size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-800">Tentang Aplikasi</h1>
              <p className="text-[11px] text-zinc-400">{appName} v{version}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* ── Hero ─────────────────────────────── */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary-dark rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/30 rounded-full blur-3xl -ml-16 -mb-16" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-lg shadow-accent/30">
                <Landmark size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">{appName}</h1>
                <p className="text-indigo-200 text-xs">
                  Point of Sale & {businessType} System
                </p>
              </div>
            </div>
            <p className="text-indigo-100 text-sm leading-relaxed max-w-md">
              Aplikasi kasir & layanan agen bisnis yang lengkap dengan manajemen
              produk, transaksi, multi-rekening, dan laporan keuangan — dirancang
              untuk berbagai jenis bisnis seperti BRILink, counter HP, agen pulsa,
              agen pembayaran, dan toko retail di Indonesia.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-[10px] text-indigo-200 uppercase tracking-wider">Versi</p>
                <p className="text-sm font-bold mt-0.5">{version}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-[10px] text-indigo-200 uppercase tracking-wider">Mode</p>
                <p className="text-sm font-bold mt-0.5">{electron ? "Desktop" : "Web"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-[10px] text-indigo-200 uppercase tracking-wider">Build</p>
                <p className="text-sm font-bold mt-0.5">{packaged ? "Release" : "Dev"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Developer Card ───────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Code2 size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-zinc-800">Dibuat oleh Developer</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shrink-0">
              <span className="text-white text-2xl font-bold">HR</span>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold text-zinc-800">Herdian Rony</h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                Full-Stack Developer & Builder
              </p>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Mengembangkan aplikasi POS & agen bisnis dengan fokus pada kemudahan
                penggunaan untuk pelaku UMKM Indonesia.
              </p>

              {/* Social links */}
              <div className="flex flex-wrap gap-2 mt-4">
                <a
                  href="https://github.com/herdianrony"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Globe size={14} /> GitHub
                </a>
                <a
                  href="mailto:herdianrony@gmail.com"
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Mail size={14} /> Email
                </a>
                <a
                  href="https://github.com/herdianrony/pos-and-brilink-application"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={14} /> Repository
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Support Card (Sociabuzz) ────────── */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl border-2 border-amber-200 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-200/40 rounded-full blur-3xl -mr-12 -mt-12" />

          <div className="relative">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
                <Heart size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-800">
                  Dukung Pengembangan
                </h2>
                <p className="text-sm text-amber-700/80 mt-0.5">
                  Bantu saya terus mengembangkan aplikasi ini
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-600 leading-relaxed mb-5">
              Aplikasi ini gratis & open-source. Dukungan Anda sangat berarti untuk
              pengembangan fitur baru, perbaikan bug, dan biaya operasional.
              Setiap kontribusi — sekecil apapun — sangat dihargai! heart
            </p>

            {/* CTA button */}
            <a
              href="https://sociabuzz.com/herdianrony/tribe"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full sm:w-auto"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-6 py-4 rounded-2xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group">
                <Heart size={20} className="fill-white" />
                <span>Dukung via Sociabuzz</span>
                <ExternalLink size={16} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </a>

            <p className="text-[11px] text-amber-700/70 mt-3 text-center sm:text-left">
              sociabuzz.com/herdianrony/tribe
            </p>

            {/* What supporters get */}
            <div className="mt-6 pt-5 border-t border-amber-200/60">
              <p className="text-xs font-semibold text-amber-800 mb-2.5">
                Dengan dukungan Anda, saya bisa:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { icon: Zap, text: "Update fitur lebih cepat" },
                  { icon: Star, text: "Pertahankan gratis selamanya" },
                  { icon: Users, text: "Support komunitas UMKM" },
                ].map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-sm">
                      <Icon size={14} className="text-amber-600 shrink-0" />
                      <span className="text-xs text-zinc-700 font-medium">{b.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Features ────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-zinc-800">Fitur Utama</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Smartphone, title: "POS & Kasir", desc: "Transaksi cepat dengan barcode scanner" },
              { icon: Landmark, title: "Layanan Agen", desc: "Transfer, tarik tunai, setor, pembayaran" },
              { icon: ShieldCheck, title: "Multi-Akun", desc: "Admin & kasir dengan otoritas berbeda" },
              { icon: Printer, title: "Printer Thermal", desc: "Cetak struk otomatis via ESC/POS" },
              { icon: Zap, title: "Auto-Update", desc: "Update otomatis dari GitHub Releases" },
              { icon: Coffee, title: "Offline-First", desc: "Bekerja tanpa internet (SQLite lokal)" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-700">{f.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tech Stack ──────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Code2 size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-zinc-800">Teknologi</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4",
              "Drizzle ORM", "SQLite (libsql)", "Electron 22", "JWT (jose)",
              "bcryptjs", "node-thermal-printer", "electron-updater",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-zinc-200 text-xs font-medium text-zinc-600"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────── */}
        <footer className="text-center py-6">
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} {appName} — Dibuat oleh{" "}
            <a
              href="https://github.com/herdianrony"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline"
            >
              herdianrony
            </a>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Open Source • MIT License
          </p>
        </footer>
      </main>
    </div>
  );
}
