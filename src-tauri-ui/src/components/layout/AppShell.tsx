import { useEffect, useState, type ReactNode } from "react";
import { Clock, Heart, Info, LogOut } from "lucide-react";
import type { PublicUser } from "../../api";
import type { ViewKey } from "../../types";
import { Icon } from "../AppIcon";
import { navItems } from "../../config/navigation";
import { tw } from "../../lib/tw";

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
  const isAdmin = user.role === "admin";
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function showAbout() {
    window.alert("CatatAgen Local\nAplikasi POS dan pencatatan layanan agen lokal berbasis Tauri.");
  }

  function showSupport() {
    window.alert("Support CatatAgen Local\nUntuk bantuan, hubungi owner/developer aplikasi atau buka dokumentasi proyek.");
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
            <button key={item.id} className={tw(activeView === item.id ? "nav-item active" : "nav-item")} onClick={() => onNavigate(item.id)}>
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
          <div className={tw("time-card-redesign")}>
            <Clock size={18} />
            <div>
              <strong>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</strong>
              <small>{now.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}</small>
            </div>
          </div>
        </div>
      </aside>

      <section className={tw("content-shell content-shell-redesign")}>
        <div className={tw("status-strip-redesign")}>
          <span>{message || "Siap"}</span>
          <button onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
        </div>
        <main className={tw("page-content page-content-redesign")}>{children}</main>
      </section>
    </div>
  );
}
