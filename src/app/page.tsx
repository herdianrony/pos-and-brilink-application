"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import POS from "@/components/POS";
import BRILink from "@/components/BRILink";
import Products from "@/components/Products";
import History from "@/components/History";
import Cash from "@/components/Cash";
import SettingsPage from "@/components/Settings";
import RekeningKoran from "@/components/RekeningKoran";

export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  // P1-02: Listen for hashchange to support navigation from child components
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        // Map hash to page IDs
        const validPages = [
          "dashboard",
          "pos",
          "brilink",
          "products",
          "history",
          "rekeningKoran",
          "cash",
          "settings",
        ];
        if (validPages.includes(hash)) {
          setPage(hash);
          // Clear hash so it doesn't loop
          window.location.hash = "";
        }
      }
    }
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">
            Mempersiapkan aplikasi...
          </p>
        </div>
      </div>
    );
  }

  function renderPage() {
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
      <Sidebar active={page} onNav={setPage} />
      <main className="flex-1 p-4 lg:p-6 overflow-auto min-w-0 ml-0 lg:ml-0">
        <div className="lg:hidden h-12" /> {/* spacer for mobile hamburger */}
        {renderPage()}
      </main>
    </div>
  );
}
