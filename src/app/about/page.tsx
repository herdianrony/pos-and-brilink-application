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
  RefreshCw,
  DownloadCloud,
} from "lucide-react";
import { getAppVersion, isElectron, isPackaged } from "@/lib/hardware";
import { useSettings } from "@/lib/use-settings";

export default function AboutPage() {
  const [version, setVersion] = useState("1.0.0");
  const [electron, setElectron] = useState(false);
  const [packaged, setPackaged] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
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

  async function checkUpdate() {
    if (!window.electronAPI?.update) return;
    setUpdateStatus("Mengecek update...");
    const result = await window.electronAPI.update.check();
    if (result?.error) setUpdateStatus(`Gagal cek update: ${result.error}`);
    else if (result?.version)
      setUpdateStatus(`Update ditemukan: v${result.version}`);
    else setUpdateStatus("Belum ada update baru.");
  }

  async function simulateUpdate() {
    if (!window.electronAPI?.update) return;
    setUpdateStatus("Menjalankan simulasi update...");
    const result = await window.electronAPI.update.simulate("1.0.99-simulasi");
    if (result?.error) setUpdateStatus(`Simulasi gagal: ${result.error}`);
    else
      setUpdateStatus(
        "Simulasi update berjalan. Lihat notifikasi di kanan bawah.",
      );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* ── Header ─────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} /> Kembali
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md"
              style={{ backgroundColor: "#00875A" }}
            >
              <Landmark size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">
                Tentang Aplikasi
              </h1>
              <p className="text-[11px] text-slate-400">
                {appName} v{version}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* ── Hero ─────────────────────────────── */}
        <div
          className="gradient-dark rounded-3xl p-8 text-white relative overflow-hidden shadow-float"
          style={{ backgroundColor: "#0F172A" }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/30 rounded-full blur-3xl -mr-20 -mt-20 animate-float" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl -ml-16 -mb-16" />

          <div className="relative">
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-glow-primary"
                style={{ backgroundColor: "#00875A" }}
              >
                <Landmark size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {appName}
                </h1>
                <p className="text-slate-300 text-sm font-semibold">
                  Point of Sale & {businessType} System
                </p>
              </div>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed max-w-lg">
              Aplikasi kasir &amp; layanan agen bisnis yang lengkap dengan
              manajemen produk, transaksi, multi-rekening, dan laporan keuangan
              — dirancang untuk berbagai jenis bisnis seperti BRILink, counter
              HP, agen pulsa, agen pembayaran, dan toko retail di Indonesia.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider">
                  Versi
                </p>
                <p className="text-sm font-bold mt-0.5">{version}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider">
                  Mode
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {electron ? "Desktop" : "Web"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider">
                  Build
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {packaged ? "Release" : "Dev"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {electron && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <DownloadCloud size={18} className="text-primary" />
              <h2 className="text-lg font-extrabold text-slate-800">
                Update Aplikasi Desktop
              </h2>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Versi desktop bisa mengecek update dari GitHub Releases. Tombol
              simulasi hanya menguji alur notifikasi update tanpa mengunduh
              installer sungguhan.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={checkUpdate}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Cek Update
              </button>
              <button
                onClick={simulateUpdate}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={16} /> Simulasi Update
              </button>
            </div>
            {updateStatus && (
              <p className="mt-3 text-xs font-semibold text-slate-500">
                {updateStatus}
              </p>
            )}
          </div>
        )}

        {/* ── Developer Card ───────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Code2 size={18} className="text-primary" />
            <h2 className="text-lg font-extrabold text-slate-800">
              Dibuat oleh Developer
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shrink-0"
              style={{ backgroundColor: "#00875A" }}
            >
              <span className="text-white text-2xl font-extrabold">HR</span>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-slate-800">
                Herdian Rony
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Full-Stack Developer & Builder
              </p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Mengembangkan aplikasi POS & agen bisnis dengan fokus pada
                kemudahan penggunaan untuk pelaku UMKM Indonesia.
              </p>

              {/* Social links */}
              <div className="flex flex-wrap gap-2 mt-4">
                <a
                  href="https://github.com/herdianrony"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Globe size={14} /> GitHub
                </a>
                <a
                  href="mailto:herdianrony@gmail.com"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Mail size={14} /> Email
                </a>
                <a
                  href="https://github.com/herdianrony/pos-and-brilink-application"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
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
                <h2 className="text-lg font-extrabold text-slate-800">
                  Dukung Pengembangan
                </h2>
                <p className="text-sm text-amber-700/80 mt-0.5">
                  Bantu saya terus mengembangkan aplikasi ini
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              Aplikasi ini gratis & open-source. Dukungan Anda sangat berarti
              untuk pengembangan fitur baru, perbaikan bug, dan biaya
              operasional. Setiap kontribusi — sekecil apapun — sangat dihargai!
              heart
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
                <ExternalLink
                  size={16}
                  className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                />
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
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-sm"
                    >
                      <Icon size={14} className="text-amber-600 shrink-0" />
                      <span className="text-xs text-slate-700 font-medium">
                        {b.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Features ────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={18} className="text-primary" />
            <h2 className="text-lg font-extrabold text-slate-800">
              Fitur Utama
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: Smartphone,
                title: "POS & Kasir",
                desc: "Transaksi cepat dengan barcode scanner",
              },
              {
                icon: Landmark,
                title: "Layanan Agen",
                desc: "Transfer, tarik tunai, setor, pembayaran",
              },
              {
                icon: ShieldCheck,
                title: "Multi-Akun",
                desc: "Admin & kasir dengan otoritas berbeda",
              },
              {
                icon: Printer,
                title: "Printer Thermal",
                desc: "Cetak struk otomatis via ESC/POS",
              },
              {
                icon: Zap,
                title: "Auto-Update",
                desc: "Update otomatis dari GitHub Releases",
              },
              {
                icon: Coffee,
                title: "Offline-First",
                desc: "Bekerja tanpa internet (SQLite lokal)",
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">
                      {f.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tech Stack ──────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Code2 size={18} className="text-primary" />
            <h2 className="text-lg font-extrabold text-slate-800">Teknologi</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Next.js 16",
              "React 19",
              "TypeScript",
              "Tailwind CSS 4",
              "Drizzle ORM",
              "SQLite (libsql)",
              "Electron 43",
              "JWT (jose)",
              "bcryptjs",
              "node-thermal-printer",
              "electron-updater",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-slate-200 text-xs font-medium text-slate-600"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────── */}
        <footer className="text-center py-6">
          <p className="text-xs text-slate-400">
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
          <p className="text-[11px] text-slate-400 mt-1">
            Open Source • MIT License
          </p>
        </footer>
      </main>
    </div>
  );
}
