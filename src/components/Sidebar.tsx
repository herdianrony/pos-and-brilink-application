"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Landmark,
  Package,
  ClipboardList,
  Settings,
  Wallet,
  Menu,
  X,
  LogOut,
  Shield,
  User as UserIcon,
  Info,
  Heart,
  Clock,
  ScrollText,
} from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { useSettings } from "@/lib/use-settings";

interface UserInfo {
  id: number;
  name: string;
  username: string;
  role: string;
}

// P1-1: Role-based navigation
// Kasir: Dashboard, POS, Layanan Agen, Transaksi (read-only own)
// Admin: semua menu
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { id: "pos", label: "Kasir POS", icon: ShoppingCart, adminOnly: false },
  { id: "brilink", label: "__SERVICES__", icon: Landmark, adminOnly: false },
  { id: "products", label: "Produk", icon: Package, adminOnly: true },
  { id: "history", label: "Transaksi", icon: ClipboardList, adminOnly: false },
  { id: "rekeningKoran", label: "Rekening Koran", icon: ScrollText, adminOnly: true },
  { id: "cash", label: "Kas & Saldo", icon: Wallet, adminOnly: true },
  { id: "settings", label: "Pengaturan", icon: Settings, adminOnly: true },
];

export default function Sidebar({
  active,
  onNav,
}: {
  active: string;
  onNav: (page: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      setLoggingOut(false);
    }
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase()
    : "U";

  const appName = settings.app_name || "POS & Agen Bisnis";
  const servicesLabel = settings.services_label || "Layanan Agen";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-2xl shadow-float border border-slate-200/60 text-slate-700 active:scale-95 transition-transform"
      >
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-[55] lg:hidden animate-fadeIn"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-72 z-[56] flex flex-col transition-transform duration-300 lg:translate-x-0",
          "gradient-dark",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#0F172A" }}
      >
        {/* Decorative gradient glow */}
        <div className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 0% 0%, rgba(0,179,126,0.3) 0%, transparent 50%)",
          }}
        />
        <div className="absolute bottom-0 right-0 w-48 h-48 opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="relative p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-primary" style={{ backgroundColor: "#00875A" }}>
              <Landmark size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-extrabold text-base tracking-tight truncate">{appName}</h1>
              <p className="text-slate-400 text-[11px] font-medium">{settings.business_type || "Agen Bisnis"}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white active:scale-90 transition-all">
            <X size={22} />
          </button>
        </div>

        {/* Nav — P1-1: Role-based visibility */}
        <nav className="relative flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems
            .filter(item => !(item.adminOnly && user?.role === "kasir"))
            .map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const label = item.label === "__SERVICES__" ? servicesLabel : item.label;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNav(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 group relative font-bold text-sm",
                  isActive
                    ? "gradient-primary text-white shadow-glow-primary active:scale-95"
                    : "text-slate-300 hover:bg-white/10 hover:text-white active:scale-95"
                )}
              >
                <Icon size={20} className={cn(
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )} />
                <span className="flex-1">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* User + Actions */}
        {user && (
          <div className="relative px-3 pb-3 space-y-2">
            {/* About & Support */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  window.open("/about", "_blank");
                  setOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition-all active:scale-95"
              >
                <Info size={14} />
                <span>Tentang</span>
              </a>
              <a
                href="https://sociabuzz.com/herdianrony/tribe"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl bg-accent/20 hover:bg-accent/30 text-accent-light hover:text-white text-[11px] font-bold transition-all active:scale-95"
                style={{ backgroundColor: "rgba(124, 58, 237, 0.2)" }}
              >
                <Heart size={13} className="fill-current" />
                <span>Support</span>
              </a>
            </div>

            {/* User card */}
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm p-3 flex items-center gap-3 border border-white/5">
              <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center text-sm font-extrabold text-white shrink-0 shadow-glow-primary" style={{ backgroundColor: "#00875A" }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{user.name}</p>
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
                onClick={handleLogout}
                disabled={loggingOut}
                title="Keluar"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/80 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 disabled:opacity-50"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="relative p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
              <Clock size={18} className="text-slate-300" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">{time}</p>
              <p className="text-slate-400 text-[11px]">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
