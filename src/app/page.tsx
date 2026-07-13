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

export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 font-medium">Mempersiapkan aplikasi...</p>
        </div>
      </div>
    );
  }

  function renderPage() {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "pos": return <POS />;
      case "brilink": return <BRILink />;
      case "products": return <Products />;
      case "history": return <History />;
      case "cash": return <Cash />;
      case "settings": return <SettingsPage />;
      default: return <Dashboard />;
    }
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar active={page} onNav={setPage} />
      <main className="flex-1 p-4 lg:p-6 overflow-auto min-w-0 ml-0 lg:ml-0">
        <div className="lg:hidden h-12" /> {/* spacer for mobile hamburger */}
        {renderPage()}
      </main>
    </div>
  );
}
