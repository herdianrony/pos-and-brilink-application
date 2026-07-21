import { memo, useEffect, useState, type ReactNode } from "react";
import { Clock, Heart, Info, LogOut, X } from "lucide-react";
import type { PublicUser } from "../../api";
import type { ViewKey } from "../../types";
import { Icon } from "../AppIcon";
import { navItems } from "../../config/navigation";
import { cn } from "../../lib/cn";


const SidebarClock = memo(function SidebarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-slate-300 [&_strong]:block [&_strong]:text-xl [&_strong]:font-black [&_small]:block [&_small]:text-[11px] [&_small]:text-slate-400">
      <Clock size={18} />
      <div>
        <strong>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</strong>
        <small>{now.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}</small>
      </div>
    </div>
  );
});


type ToastItem = { id: number; message: string; tone: "success" | "error" | "info" };

const toastToneClass: Record<ToastItem["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-600",
  info: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function ToastViewport({ message }: { message: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const text = message.trim();
    if (!text || text === "Siap") return;
    const tone: ToastItem["tone"] = /gagal|error|salah|tidak|wajib/i.test(text) ? "error" : /berhasil|siap|selamat/i.test(text) ? "success" : "info";
    const toast = { id: Date.now(), message: text, tone };
    setToasts((items) => [...items.slice(-2), toast]);
    const timer = window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3600);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[120] grid w-[min(380px,calc(100vw-32px))] gap-2 print:hidden" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={cn("flex items-start justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-bold shadow-[0_18px_48px_rgba(15,23,42,.18)] [&_button]:grid [&_button]:h-7 [&_button]:w-7 [&_button]:place-items-center [&_button]:rounded-xl [&_button]:bg-slate-100 [&_button]:p-0 [&_button]:text-slate-500 [&_button]:shadow-none", toastToneClass[toast.tone])}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))} aria-label="Tutup notifikasi"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function AppShell({
  user,
  activeView,
  message,
  loading,
  children,
  onNavigate,
  onRefresh,
  onLogout,
}: {
  user: PublicUser;
  activeView: ViewKey;
  message: string;
  loading: boolean;
  children: ReactNode;
  onNavigate: (view: ViewKey) => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const [shellNotice, setShellNotice] = useState<null | { title: string; message: string }>(null);
  const isAdmin = user.role === "admin";
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
  function showAbout() {
    setShellNotice({ title: "Tentang CatatAgen", message: "CatatAgen Local adalah aplikasi POS dan pencatatan layanan agen lokal berbasis Tauri." });
  }

  function showSupport() {
    setShellNotice({ title: "Support", message: "Untuk bantuan, hubungi owner/developer aplikasi atau buka dokumentasi proyek." });
  }

  return (
    <div className="min-h-screen grid grid-cols-[292px_1fr] max-[860px]:block max-[1120px]:grid-cols-[96px_1fr] print:hidden min-h-screen bg-[#f8f9fb] max-[860px]:block">
      <aside className="sticky top-0 flex h-screen flex-col gap-5 overflow-hidden px-4.5 py-5.5 text-white shadow-[22px_0_60px_rgba(15,23,42,.18)] max-[860px]:static max-[860px]:h-auto relative h-screen gap-5 bg-[linear-gradient(180deg,#0f2533_0%,#111827_58%,#101827_100%)] p-4 before:absolute before:inset-0 before:pointer-events-none before:bg-[radial-gradient(circle_at_0_0,rgba(16,185,129,.2),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(20,184,166,.12),transparent_36%)] max-[860px]:static max-[860px]:h-auto">
        <div className="relative grid items-center gap-3 text-white grid-cols-[auto_1fr] [&_strong]:block [&_strong]:text-lg [&_strong]:font-black [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:font-semibold [&_small]:text-slate-400">
          <div className="grid place-items-center rounded-[22px] bg-gradient-to-br from-emerald-700 to-emerald-500 text-white font-black tracking-tighter shadow-[0_16px_30px_rgba(4,120,87,.30)] h-16 w-16">CA</div>
          <div>
            <strong>CatatAgen</strong>
            <small>Agen Bisnis</small>
          </div>
        </div>

        <nav className="relative grid gap-2 overflow-y-auto pr-1 max-[860px]:grid-cols-3">
          {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button key={item.id} className={activeView === item.id ? "flex w-full items-center justify-start gap-3 rounded-2xl border border-transparent bg-transparent px-3.5 py-3 text-[13px] font-black text-slate-300 shadow-none hover:translate-y-0 hover:bg-white/10 hover:shadow-none max-[860px]:justify-center border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex w-full items-center justify-start gap-3 rounded-2xl border border-transparent bg-transparent px-3.5 py-3 text-[13px] font-black text-slate-300 shadow-none hover:translate-y-0 hover:bg-white/10 hover:shadow-none max-[860px]:justify-center"} onClick={() => onNavigate(item.id)} aria-current={activeView === item.id ? "page" : undefined} title={item.label}>
              <span className="inline-grid h-5.5 w-5.5 flex-none place-items-center [&_svg]:block"><Icon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </nav>

        <div className="relative mt-auto grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/5 px-2 py-2 text-xs font-black text-slate-300 shadow-none hover:translate-y-0 hover:bg-white/10 hover:shadow-none" onClick={showAbout}><Info size={14} /> Tentang</button>
            <button type="button" className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/5 px-2 py-2 text-xs font-black text-slate-300 shadow-none hover:translate-y-0 hover:bg-white/10 hover:shadow-none bg-teal-500/20 text-teal-200" onClick={showSupport}><Heart size={14} /> Support</button>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-white [&_strong]:block [&_strong]:truncate [&_strong]:text-sm [&_strong]:font-black [&_small]:block [&_small]:text-[11px] [&_small]:font-semibold [&_small]:text-slate-400">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500 text-sm font-black text-white">{initials}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role === "admin" ? "Administrator" : "Kasir"}</small>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-xl border-0 bg-white/5 p-0 text-slate-300 shadow-none hover:translate-y-0 hover:bg-white/10 hover:shadow-none" onClick={onLogout} title="Keluar"><LogOut size={18} /></button>
          </div>
          <SidebarClock />
        </div>
      </aside>

      {shellNotice && (
        <div className="absolute inset-0 z-[80] grid min-h-[calc(100vh-64px)] place-items-center bg-slate-900/55 p-6 backdrop-blur print:bg-white print:p-0 print:backdrop-blur-none">
          <section className="max-h-[calc(100vh-48px)] w-[min(720px,100%)] overflow-auto rounded-[28px] bg-white p-5.5 shadow-[0_30px_90px_rgba(15,23,42,.35)]" role="dialog" aria-modal="true" aria-label={shellNotice.title}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="m-0 mb-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-600">CatatAgen Local</p><h2>{shellNotice.title}</h2><p className="m-0 text-sm text-slate-600">{shellNotice.message}</p></div>
              <button className="grid h-9 w-9 place-items-center rounded-xl border-0 bg-white/5 p-0 text-slate-300 shadow-none hover:translate-y-0 hover:bg-white/10 hover:shadow-none" onClick={() => setShellNotice(null)} title="Tutup"><X size={18} /></button>
            </div>
          </section>
        </div>
      )}

      <section className="min-w-0 min-w-0 bg-[#f8f9fb]">
        <div className="sticky top-0 z-10 flex items-center justify-end gap-3 border-b border-slate-100 bg-[#f8f9fb]/90 px-8 py-3 backdrop-blur max-[860px]:static max-[860px]:justify-stretch [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:px-3 [&_span]:py-1.5 [&_span]:text-xs [&_span]:font-bold [&_span]:text-emerald-700 [&_button]:rounded-xl [&_button]:bg-slate-900 [&_button]:px-3 [&_button]:py-2 [&_button]:text-xs [&_button]:text-white">
          <span>CatatAgen Local siap</span>
          <button onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
        </div>
        <main className="mx-auto max-w-[1320px] p-7 max-[860px]:p-[18px] relative mx-auto min-h-[calc(100vh-64px)] max-w-[1440px] p-7 max-[860px]:p-[18px]">{children}</main>
        <ToastViewport message={message} />
      </section>
    </div>
  );
}
