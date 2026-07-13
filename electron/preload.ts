/**
 * electron/preload.ts
 *
 * Skrip preload yang berjalan di renderer process dengan akses terbatas
 * ke Node API melalui contextBridge. Ekspos hanya API yang aman ke window.
 *
 * Keamanan: contextIsolation = true, nodeIntegration = false.
 */
import { contextBridge, ipcRenderer } from "electron";

export interface PrinterConfig {
  type: "network" | "usb" | "serial" | "system";
  host?: string;
  port?: number;
  interface?: string;
  baudRate?: number;
  width?: 32 | 48;
}

export interface ReceiptData {
  store: {
    name: string;
    address?: string;
    phone?: string;
    agentId?: string;
  };
  invoice: {
    no: string;
    date: string;
    type: string;
    cashier: string;
    customer?: string;
  };
  items: Array<{
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }>;
  summary: {
    subtotal: number;
    adminFee?: number;
    total: number;
    paymentMethod?: string;
    paid?: number;
    change?: number;
  };
  footer?: string;
}

const api = {
  // ── App info ──────────────────────────────────
  app: {
    getVersion: () => ipcRenderer.invoke("app:version"),
    isPackaged: () => ipcRenderer.invoke("app:isPackaged"),
    getPath: (name: string) => ipcRenderer.invoke("app:getPath", name),
  },

  // ── Printer thermal ───────────────────────────
  printer: {
    print: (data: ReceiptData) => ipcRenderer.invoke("printer:print", data),
    test: () => ipcRenderer.invoke("printer:test"),
    status: () => ipcRenderer.invoke("printer:status"),
    getConfig: () => ipcRenderer.invoke("printer:getConfig"),
    saveConfig: (config: PrinterConfig) => ipcRenderer.invoke("printer:saveConfig", config),
    loadConfig: () => ipcRenderer.invoke("printer:loadConfig"),
  },

  // ── Auto-update ───────────────────────────────
  update: {
    check: () => ipcRenderer.invoke("update:check"),
    install: () => ipcRenderer.invoke("update:install"),
    onUpdateAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void) =>
      ipcRenderer.on("update:available", (_evt, info) => cb(info)),
    onUpdateDownloaded: (cb: (info: { version: string }) => void) =>
      ipcRenderer.on("update:downloaded", (_evt, info) => cb(info)),
    onUpdateProgress: (cb: (p: { percent: number; transferred: number; total: number }) => void) =>
      ipcRenderer.on("update:progress", (_evt, p) => cb(p)),
    onUpdateError: (cb: (e: { message: string }) => void) =>
      ipcRenderer.on("update:error", (_evt, e) => cb(e)),
    onUpdateNotAvailable: (cb: () => void) =>
      ipcRenderer.on("update:not-available", () => cb()),
  },

  // ── Window controls ───────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  },

  // ── Receipt printer shortcut untuk web app ────
  printReceipt: (data: ReceiptData) => ipcRenderer.invoke("printer:print", data),
};

contextBridge.exposeInMainWorld("electronAPI", api);

// TypeScript declaration untuk window.electronAPI — akan dipakai di renderer
export type ElectronAPI = typeof api;
