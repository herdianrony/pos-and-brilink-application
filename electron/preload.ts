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
    saveConfig: (config: PrinterConfig) =>
      ipcRenderer.invoke("printer:saveConfig", config),
    loadConfig: () => ipcRenderer.invoke("printer:loadConfig"),
  },

  // ── WhatsApp Owner (Electron native) ─────────
  whatsapp: {
    status: () => ipcRenderer.invoke("whatsapp:status"),
    start: () => ipcRenderer.invoke("whatsapp:start"),
    restart: () => ipcRenderer.invoke("whatsapp:restart"),
    logout: () => ipcRenderer.invoke("whatsapp:logout"),
    send: (payload: {
      to: string;
      message: string;
      token?: string;
      expiresAt?: number;
    }) => ipcRenderer.invoke("whatsapp:send", payload),
  },

  // ── Auto-update ───────────────────────────────
  update: {
    check: () => ipcRenderer.invoke("update:check"),
    simulate: (version?: string) =>
      ipcRenderer.invoke("update:simulate", version),
    install: () => ipcRenderer.invoke("update:install"),
    onUpdateAvailable: (
      cb: (info: { version: string; releaseNotes?: string }) => void,
    ) => {
      const handler = (
        _evt: Electron.IpcRendererEvent,
        info: { version: string; releaseNotes?: string },
      ) => cb(info);
      ipcRenderer.on("update:available", handler);
      return () => ipcRenderer.removeListener("update:available", handler);
    },
    onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
      const handler = (
        _evt: Electron.IpcRendererEvent,
        info: { version: string },
      ) => cb(info);
      ipcRenderer.on("update:downloaded", handler);
      return () => ipcRenderer.removeListener("update:downloaded", handler);
    },
    onUpdateProgress: (
      cb: (p: { percent: number; transferred: number; total: number }) => void,
    ) => {
      const handler = (
        _evt: Electron.IpcRendererEvent,
        p: { percent: number; transferred: number; total: number },
      ) => cb(p);
      ipcRenderer.on("update:progress", handler);
      return () => ipcRenderer.removeListener("update:progress", handler);
    },
    onUpdateError: (cb: (e: { message: string }) => void) => {
      const handler = (
        _evt: Electron.IpcRendererEvent,
        e: { message: string },
      ) => cb(e);
      ipcRenderer.on("update:error", handler);
      return () => ipcRenderer.removeListener("update:error", handler);
    },
    onUpdateNotAvailable: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on("update:not-available", handler);
      return () => ipcRenderer.removeListener("update:not-available", handler);
    },
    onUpdateSimulatedInstalled: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on("update:simulated-installed", handler);
      return () =>
        ipcRenderer.removeListener("update:simulated-installed", handler);
    },
  },

  // ── Report/PDF export ────────────────────────
  report: {
    savePdf: (payload: { html: string; defaultPath?: string }) =>
      ipcRenderer.invoke("report:savePdf", payload),
  },

  // ── Window controls ───────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  },

  // ── Receipt printer shortcut untuk web app ────
  printReceipt: (data: ReceiptData) =>
    ipcRenderer.invoke("printer:print", data),
};

contextBridge.exposeInMainWorld("electronAPI", api);

// TypeScript declaration untuk window.electronAPI — akan dipakai di renderer
export type ElectronAPI = typeof api;
