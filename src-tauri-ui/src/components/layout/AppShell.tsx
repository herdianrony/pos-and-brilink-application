import type { ReactNode } from "react";
import { Clock, Heart, Info, LogOut } from "lucide-react";
import type { PublicUser } from "../../api";
import type { ViewKey } from "../../types";
import { Icon } from "../AppIcon";
import { navItems } from "../../config/navigation";

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

  return (
    <div className="app-shell app-shell-redesign">
      <aside className="sidebar sidebar-redesign">
        <div className="brand-block">
          <div className="brand-mark">CA</div>
          <div>
            <strong>CatatAgen</strong>
            <small>Agen Bisnis</small>
          </div>
        </div>

        <nav className="nav-redesign">
          {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button key={item.id} className={activeView === item.id ? "nav-item active" : "nav-item"} onClick={() => onNavigate(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom-redesign">
          <div className="support-row">
            <button type="button" className="support-button"><Info size={14} /> Tentang</button>
            <button type="button" className="support-button support"><Heart size={14} /> Support</button>
          </div>
          <div className="user-card-redesign">
            <div className="user-avatar">{initials}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role === "admin" ? "Administrator" : "Kasir"}</small>
            </div>
            <button className="logout-icon-button" onClick={onLogout} title="Keluar"><LogOut size={18} /></button>
          </div>
          <div className="time-card-redesign">
            <Clock size={18} />
            <div>
              <strong>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</strong>
              <small>{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="content-shell content-shell-redesign">
        <div className="status-strip-redesign">
          <span>{message || "Siap"}</span>
          <button onClick={onRefresh} disabled={loading}>{loading ? "Memuat..." : "Refresh"}</button>
        </div>
        <main className="page-content page-content-redesign">{children}</main>
      </section>
    </div>
  );
}
