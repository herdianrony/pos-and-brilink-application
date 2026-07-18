"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import POS from "@/components/POS";
import BRILink from "@/components/BRILink";
import Products from "@/components/Products";
import History from "@/components/History";
import Cash from "@/components/Cash";
import SettingsPage from "@/components/Settings";
import RekeningKoran from "@/components/RekeningKoran";

const VALID_PAGES = [
  "dashboard",
  "pos",
  "brilink",
  "products",
  "history",
  "rekeningKoran",
  "cash",
  "settings",
];

const ADMIN_ONLY_PAGES = new Set(["products", "rekeningKoran", "cash", "settings"]);

type CurrentUser = { role: string; name?: string } | null;

function canAccessPage(page: string, user: CurrentUser) {
  if (!ADMIN_ONLY_PAGES.has(page)) return true;
  return user?.role === "admin";
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h2 className="text-xl font-extrabold text-amber-900">Akses Admin Diperlukan</h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-800">
        Menu ini hanya untuk owner/admin. Akun kasir tetap bisa memakai Dashboard, Kasir POS, Layanan Agen, dan Riwayat Transaksi.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 rounded-2xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700"
      >
        Kembali ke Dashboard
      </button>
    </section>
  );
}

export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<CurrentUser>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));
  }, []);

  function navigate(nextPage: string) {
    if (!VALID_PAGES.includes(nextPage)) return;
    if (!canAccessPage(nextPage, user)) {
      setPage("dashboard");
      return;
    }
    setPage(nextPage);
  }

  // P1-02: Listen for hashchange to support navigation from child components.
  // Role guard: kasir cannot deep-link into admin-only pages via /#settings, /#cash, etc.
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace("#", "");
      if (hash && VALID_PAGES.includes(hash)) {
        if (canAccessPage(hash, user)) setPage(hash);
        else setPage("dashboard");
        // Clear hash so it doesn't loop
        window.location.hash = "";
      }
    }
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [user]);

  useEffect(() => {
    if (authReady && !canAccessPage(page, user)) {
      setPage("dashboard");
    }
  }, [authReady, page, user]);

  if (!ready || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Mempersiapkan aplikasi...</p>
        </div>
      </div>
    );
  }

  function renderPage() {
    if (!canAccessPage(page, user)) {
      return <AccessDenied onBack={() => setPage("dashboard")} />;
    }

    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "pos":
        return <POS />;
      case "brilink":
        return <BRILink />;
      case "products":
        return <Products />;
      case "history":
        return <History />;
      case "rekeningKoran":
        return <RekeningKoran />;
      case "cash":
        return <Cash />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar active={page} onNav={navigate} />
      <main className="flex-1 p-4 lg:p-6 overflow-auto min-w-0 ml-0 lg:ml-0">
        <div className="lg:hidden h-12" /> {/* spacer for mobile hamburger */}
        {renderPage()}
      </main>
    </div>
  );
}
