import type { ReactNode } from "react";
import type { PublicUser } from "../../api";
import type { ViewKey } from "../../types";
import { Icon } from "../AppIcon";
import { navItems } from "../../config/navigation";

export function AppShell({
  user,
  activeView,
  searchTerm,
  message,
  loading,
  children,
  onNavigate,
  onSearchChange,
  onRefresh,
  onLogout,
}: {
  user: PublicUser;
  activeView: ViewKey;
  searchTerm: string;
  message: string;
  loading: boolean;
  children: ReactNode;
  onNavigate: (view: ViewKey) => void;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const isAdmin = user.role === "admin";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-row"><div className="brand-mark small">CA</div><div><strong>CatatAgen</strong><small>Local Edition</small></div></div>
        <nav>
          {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button key={item.id} className={activeView === item.id ? "nav-item active" : "nav-item"} onClick={() => onNavigate(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>Login sebagai</small>
          <strong>{user.name}</strong>
          <span>{user.role}</span>
          <button className="secondary logout-button" onClick={onLogout}>Keluar</button>
        </div>
      </aside>
      <section className="content-shell">
        <header className="topbar">
          <label className="search-box"><Icon name="search" /> <input value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} placeholder="Cari produk, transaksi, pelanggan..." /></label>
          <div className="topbar-actions"><span className="status-pill">{message || "Siap"}</span><button onClick={onRefresh} disabled={loading}>Refresh</button></div>
        </header>
        <main className="page-content">{children}</main>
      </section>
    </div>
  );
}
