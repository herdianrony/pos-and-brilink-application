import { memo, useEffect, useState, type ReactNode } from "react";
import {
  Clock,
  Heart,
  Info,
  Landmark,
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import type { PublicUser } from "../../api";
import type { ViewKey } from "../../types";
import { Icon } from "../AppIcon";
import { navItems } from "../../config/navigation";
import { cn } from "../../lib/cn";

/* ------------------------------------------------------------------ */
/*  Icon-only sidebar tooltip                                          */
/* ------------------------------------------------------------------ */
function NavTooltip({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-bold text-white whitespace-nowrap z-70",
        "bg-slate-900 border border-slate-700 shadow-float",
        "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
        "transition-all duration-150 pointer-events-none",
        "-translate-x-1 group-hover:translate-x-0",
      )}
    >
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Clock (mobile sidebar only)                                        */
/* ------------------------------------------------------------------ */
const SidebarClock = memo(function SidebarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative p-4 border-t border-white/5">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
          <Clock size={18} className="text-slate-300" />
        </div>
        <div>
          <p className="text-white text-sm font-bold">
            {now.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-slate-400 text-[11px]">
            {now.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Toast system (same as before)                                      */
/* ------------------------------------------------------------------ */
type ToastItem = {
  id: number;
  message: string;
  tone: "success" | "error" | "info" | "warning";
};

const toastConfig: Record<
  ToastItem["tone"],
  { border: string; bg: string; text: string; icon: string }
> = {
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    icon: "\u2713",
  },
  error: {
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-600",
    icon: "\u2715",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-600",
    icon: "!",
  },
  info: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-600",
    icon: "i",
  },
};

function ToastViewport({ message }: { message: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const text = message.trim();
    if (!text || text === "Siap") return;
    const tone: ToastItem["tone"] = /gagal|error|salah|tidak|wajib/i.test(text)
      ? "error"
      : /berhasil|siap|selamat/i.test(text)
        ? "success"
        : /peringatan|warning|hati/i.test(text)
          ? "warning"
          : "info";
    const toast = { id: Date.now(), message: text, tone };
    setToasts((items) => [...items.slice(-2), toast]);
    const timer = window.setTimeout(
      () => setToasts((items) => items.filter((item) => item.id !== toast.id)),
      4000,
    );
    return () => window.clearTimeout(timer);
  }, [message]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-120 space-y-3 max-w-sm w-full pointer-events-none print:hidden"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const cfg = toastConfig[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto bg-white rounded-2xl shadow-float border-2 p-4 flex items-start gap-3 animate-slideInRight",
              cfg.border,
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                cfg.bg,
              )}
            >
              <span className={cn("text-xs font-bold", cfg.text)}>
                {cfg.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm text-slate-600 leading-snug font-medium">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setToasts((items) => items.filter((item) => item.id !== t.id))
              }
              className="text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full-width mobile sidebar (overlay, with text labels)              */
/* ------------------------------------------------------------------ */
function MobileSidebar({
  user,
  activeView,
  open,
  onClose,
  onNavigate,
  onLogout,
  onAbout,
  onSupport,
}: {
  user: PublicUser;
  activeView: ViewKey;
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewKey) => void;
  onLogout: () => void;
  onAbout: () => void;
  onSupport: () => void;
}) {
  const isAdmin = user.role === "admin";
  const initials =
    user.name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U";

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/50 z-55 animate-fadeIn no-print"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 left-0 h-screen w-72 z-56 flex flex-col animate-slideUp no-print"
        style={{ backgroundColor: "#0F172A" }}
      >
        {/* Decorative gradient glow */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(0,179,126,0.3) 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-48 h-48 opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="relative p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-primary"
              style={{ backgroundColor: "#00875A" }}
            >
              <Landmark size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-extrabold text-base tracking-tight truncate">
                CatatAgen
              </h1>
              <p className="text-slate-400 text-[11px] font-medium">
                Agen Bisnis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white active:scale-90 transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-3 py-2 space-y-1">
          {navItems
            .filter((item) => !(item.adminOnly && !isAdmin))
            .map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 group relative font-bold text-sm",
                    isActive
                      ? "gradient-primary text-white shadow-glow-primary active:scale-95"
                      : "text-slate-300 hover:bg-white/10 hover:text-white active:scale-95",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-white",
                    )}
                  >
                    <Icon name={item.icon} />
                  </span>
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* User + Actions */}
        <div className="relative px-3 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onAbout();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition-all active:scale-95"
            >
              <Info size={14} />
              <span>Tentang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSupport();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl hover:bg-accent/30 text-accent-light hover:text-white text-[11px] font-bold transition-all active:scale-95"
              style={{ backgroundColor: "rgba(124, 58, 237, 0.2)" }}
            >
              <Heart size={13} className="fill-current" />
              <span>Support</span>
            </button>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 flex items-center gap-3 border border-white/5">
            <div
              className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center text-sm font-extrabold text-white shrink-0 shadow-glow-primary"
              style={{ backgroundColor: "#00875A" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">
                {user.name}
              </p>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                {user.role === "admin" ? (
                  <>
                    <Shield size={11} className="text-emerald-400" />
                    <span>Administrator</span>
                  </>
                ) : (
                  <>
                    <UserIcon size={11} />
                    <span>Kasir</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Keluar"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/80 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90"
              aria-label="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <SidebarClock />
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  AppShell — desktop: icon-only sidebar | mobile: full overlay       */
/* ------------------------------------------------------------------ */
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
  const [shellNotice, setShellNotice] = useState<null | {
    title: string;
    message: string;
  }>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user.role === "admin";
  const initials =
    user.name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U";

  function showAbout() {
    setShellNotice({
      title: "Tentang CatatAgen",
      message:
        "CatatAgen Local adalah aplikasi POS dan pencatatan layanan agen lokal berbasis Tauri.",
    });
  }
  function showSupport() {
    setShellNotice({
      title: "Support",
      message:
        "Untuk bantuan, hubungi owner/developer aplikasi atau buka dokumentasi proyek.",
    });
  }

  const visibleNavItems = navItems.filter(
    (item) => !(item.adminOnly && !isAdmin),
  );

  return (
    <div className="min-h-screen flex">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-2xl shadow-float border border-slate-200/60 text-slate-700 active:scale-95 transition-transform no-print"
      >
        <Menu size={22} />
      </button>

      {/* ── Desktop: Icon-only sidebar (w-16 = 64px) ── */}
      <aside
        className="hidden lg:flex sticky top-0 left-0 h-screen w-16 z-40 flex-col items-center no-print"
        style={{ backgroundColor: "#0F172A" }}
      >
        {/* Subtle gradient glow */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none rounded-none"
          style={{
            background:
              "radial-gradient(ellipse at 0% 0%, rgba(0,179,126,0.25) 0%, transparent 60%)",
          }}
        />

        {/* Logo icon */}
        <div className="relative pt-4 pb-3">
          <div
            className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-primary"
            style={{ backgroundColor: "#00875A" }}
          >
            <Landmark size={18} className="text-white" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-white/10 mb-2" />

        {/* Nav icons — centered */}
        <nav className="relative flex-1 flex flex-col items-center gap-1 py-1 w-full px-2">
          {visibleNavItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "gradient-primary text-white shadow-glow-primary active:scale-90"
                    : "text-slate-400 hover:bg-white/10 hover:text-white active:scale-90",
                )}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                <Icon name={item.icon} />
                <NavTooltip label={item.label} />
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="relative flex flex-col items-center gap-1 pb-2 px-2">
          <div className="w-8 h-px bg-white/10 mb-1" />

          {/* About */}
          <button
            onClick={showAbout}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            title="Tentang"
          >
            <Info size={18} />
            <NavTooltip label="Tentang" />
          </button>

          {/* Support */}
          <button
            onClick={showSupport}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            title="Support"
          >
            <Heart size={16} className="fill-current" />
            <NavTooltip label="Support" />
          </button>

          {/* Divider */}
          <div className="w-8 h-px bg-white/10 my-1" />

          {/* User avatar */}
          <div className="relative group">
            <div
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-xs font-extrabold text-white shadow-glow-primary cursor-default"
              style={{ backgroundColor: "#00875A" }}
            >
              {initials}
            </div>
            <NavTooltip
              label={`${user.name} (${user.role === "admin" ? "Administrator" : "Kasir"})`}
            />
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-red-500/80 hover:text-white transition-all active:scale-90 mb-3"
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut size={17} />
            <NavTooltip label="Keluar" />
          </button>
        </div>
      </aside>

      {/* ── Mobile: Full overlay sidebar ── */}
      <MobileSidebar
        user={user}
        activeView={activeView}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onAbout={showAbout}
        onSupport={showSupport}
      />

      {/* About/Support modal */}
      {shellNotice && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-6"
          onClick={() => setShellNotice(null)}
        >
          <div className="absolute inset-0 bg-slate-950/50 animate-fadeIn" />
          <div className="relative bg-white rounded-3xl shadow-float w-full max-w-md animate-bounceIn border border-slate-200/50 p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                  CatatAgen Local
                </p>
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">
                  {shellNotice.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {shellNotice.message}
                </p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShellNotice(null)}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto min-w-0">
        <div className="lg:hidden h-12" /> {/* spacer for mobile hamburger */}
        {children}
      </main>

      <ToastViewport message={message} />
    </div>
  );
}
