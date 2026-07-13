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
  ChevronRight,
} from "lucide-react";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { id: "pos", label: "Kasir POS", icon: ShoppingCart, color: "text-emerald-500" },
  { id: "brilink", label: "BRILink", icon: Landmark, color: "text-purple-500" },
  { id: "products", label: "Produk", icon: Package, color: "text-amber-500" },
  { id: "history", label: "Transaksi", icon: ClipboardList, color: "text-cyan-500" },
  { id: "cash", label: "Kas & Saldo", icon: Wallet, color: "text-green-500" },
  { id: "settings", label: "Pengaturan", icon: Settings, color: "text-gray-500" },
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

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-700"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-72 z-[56] flex flex-col transition-transform duration-300 lg:translate-x-0",
          "bg-gradient-to-b from-primary via-primary to-primary-dark",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-lg shadow-accent/30">
              <Landmark size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base">BRILink POS</h1>
              <p className="text-blue-200 text-[11px]">Point of Sale System</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-blue-200 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNav(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group",
                  isActive
                    ? "bg-white/15 text-white shadow-lg shadow-black/10"
                    : "text-blue-200 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon size={19} className={cn(isActive ? "text-accent" : "text-blue-300 group-hover:text-blue-100")} />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-accent" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-sm font-bold text-white">
              🕐
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{time}</p>
              <p className="text-blue-300 text-[11px]">
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
