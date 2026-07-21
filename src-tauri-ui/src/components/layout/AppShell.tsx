import { memo, useEffect, useState, type ReactNode } from "react";
import { Clock, Heart, Info, LogOut, X } from "lucide-react";
import type { PublicUser } from "../../api";
import type { ViewKey } from "../../types";
import { Icon } from "../AppIcon";
import { navItems } from "../../config/navigation";
import { tw } from "../../lib/tw";


const SidebarClock = memo(function SidebarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={tw("time-card-redesign")}>
      <Clock size={18} />
      <div>
        <strong>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</strong>
        <small>{now.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}</small>
      </div>
    </div>
  );
});


type ToastItem = { id: number; message: string; tone: "success" | "error" | "info" };

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
    <div className={tw("toast-viewport")} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={tw(`toast-card ${toast.tone}`)}>
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
    <div className={tw("app-shell app-shell-redesign")}>
      <aside className={tw("sidebar sidebar-redesign")}>
        <div className={tw("brand-block")}>
          <div className={tw("brand-mark")}>CA</div>
          <div>
            <strong>CatatAgen</strong>
            <small>Agen Bisnis</small>
          </div>
        </div>

        <nav className={tw("nav-redesign")}>
          {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button key={item.id} className={tw(activeView === item.id ? "nav-item active" : "nav-item")} onClick={() => onNavigate(item.id)} aria-current={activeView === item.id ? "page" : undefined} title={item.label}>
              <span className={tw("nav-icon")}><Icon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </nav>

        <div className={tw("sidebar-bottom-redesign")}>
          <div className={tw("support-row")}>
            <button type="button" className={tw("support-button")} onClick={showAbout}><Info size={14} /> Tentang</button>
            <button type="button" className={tw("support-button support")} onClick={showSupport}><Heart size={14} /> Support</button>
          </div>
          <div className={tw("user-card-redesign")}>
            <div className={tw("user-avatar")}>{initials}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role === "admin" ? "Administrator" : "Kasir"}</small>
            </div>
            <button className={tw("logout-icon-button")} onClick={onLogout} title="Keluar"><LogOut size={18} /></button>
          </div>
          <SidebarClock />
        </div>
      </aside>

      {shellNotice && (
        <div className={tw("modal-backdrop")}>
          <section className={tw("dialog-card")} role="dialog" aria-modal="true" aria-label={shellNotice.title}>
            <div className={tw("flex items-start justify-between gap-3")}>
              <div><p className={tw("eyebrow")}>CatatAgen Local</p><h2>{shellNotice.title}</h2><p className={tw("m-0 text-sm text-slate-600")}>{shellNotice.message}</p></div>
              <button className={tw("logout-icon-button")} onClick={() => setShellNotice(null)} title="Tutup"><X size={18} /></button>
            </div>
          </section>
        </div>
      )}

      <section className={tw("content-shell content-shell-redesign")}>
        <div className={tw("status-strip-redesign")}>
          <span>CatatAgen Local siap</span>
          <button onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
        </div>
        <main className={tw("page-content page-content-redesign")}>{children}</main>
        <ToastViewport message={message} />
      </section>
    </div>
  );
}
