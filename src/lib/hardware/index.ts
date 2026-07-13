"use client";

import type { ReceiptData, PrinterConfig } from "@/types/electron";

/**
 * Helper untuk interaksi dengan Electron dari renderer Next.js.
 * Berfungsi sebagai wrapper ke window.electronAPI yang di-expose via preload.
 *
 * Jika berjalan di browser biasa (bukan Electron), fungsi akan return
 * nilai default aman atau throw error yang informatif.
 */

export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

export function getElectronAPI() {
  if (!isElectron()) {
    return null;
  }
  return window.electronAPI!;
}

// ── Printer helpers ──────────────────────────────
export async function printReceipt(data: ReceiptData): Promise<{ ok: boolean; error?: string }> {
  const api = getElectronAPI();
  if (!api) {
    // Fallback: gunakan browser print dialog (Ctrl+P)
    if (typeof window !== "undefined") {
      window.print();
      return { ok: true };
    }
    return { ok: false, error: "Tidak berjalan di Electron" };
  }
  return api.printer.print(data);
}

export async function testPrinter(): Promise<{ ok: boolean; error?: string }> {
  const api = getElectronAPI();
  if (!api) {
    return { ok: false, error: "Printer thermal hanya tersedia di aplikasi desktop" };
  }
  return api.printer.test();
}

export async function checkPrinterStatus(): Promise<{ ok: boolean; error?: string }> {
  const api = getElectronAPI();
  if (!api) {
    return { ok: false, error: "Tidak berjalan di Electron" };
  }
  return api.printer.status();
}

export async function getPrinterConfig(): Promise<PrinterConfig | null> {
  const api = getElectronAPI();
  if (!api) return null;
  return api.printer.getConfig();
}

export async function savePrinterConfig(config: PrinterConfig): Promise<{ ok: boolean }> {
  const api = getElectronAPI();
  if (!api) {
    // Fallback: simpan di localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("printer-config", JSON.stringify(config));
    }
    return { ok: true };
  }
  await api.printer.saveConfig(config);
  return { ok: true };
}

export async function loadPrinterConfig(): Promise<PrinterConfig | null> {
  const api = getElectronAPI();
  if (api) {
    return await api.printer.loadConfig();
  }
  // Fallback: dari localStorage
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("printer-config");
    if (raw) {
      try {
        return JSON.parse(raw) as PrinterConfig;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ── App info helpers ─────────────────────────────
export async function getAppVersion(): Promise<string> {
  const api = getElectronAPI();
  if (!api) return "web";
  return api.app.getVersion();
}

export async function isPackaged(): Promise<boolean> {
  const api = getElectronAPI();
  if (!api) return false;
  return api.app.isPackaged();
}

// ── Window control helpers ───────────────────────
export async function minimizeWindow(): Promise<void> {
  const api = getElectronAPI();
  if (api) await api.window.minimize();
}

export async function toggleMaximize(): Promise<boolean | undefined> {
  const api = getElectronAPI();
  if (!api) return undefined;
  return api.window.maximize();
}

export async function closeWindow(): Promise<void> {
  const api = getElectronAPI();
  if (api) await api.window.close();
}
