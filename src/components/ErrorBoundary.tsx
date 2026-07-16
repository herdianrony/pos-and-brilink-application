"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled UI error:", error, info);
    try {
      const payload = JSON.stringify({
        level: "error",
        source: "renderer/ErrorBoundary",
        message: error.message || "Unhandled UI error",
        details: {
          name: error.name,
          stack: error.stack,
          componentStack: info.componentStack,
          path:
            typeof window !== "undefined"
              ? window.location.pathname
              : undefined,
        },
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/system/logs",
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        void fetch("/api/system/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }).catch(() => {});
      }
    } catch {
      // ignore logging failures
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={32} />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-slate-900">
            Aplikasi mengalami kendala
          </h1>
          <p className="mb-6 text-sm font-medium leading-relaxed text-slate-500">
            Terjadi error pada tampilan aplikasi. Data yang sudah tersimpan di
            database tidak ikut terhapus. Klik tombol di bawah untuk memuat
            ulang aplikasi.
          </p>
          <p className="mb-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
            Terjadi kesalahan. Detail telah dicatat. Hubungi administrator jika
            masalah berlanjut.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-emerald-700 active:scale-95"
          >
            <RotateCcw size={18} /> Muat Ulang
          </button>
        </section>
      </main>
    );
  }
}
