/**
 * Type declarations untuk window.electronAPI
 * Dipakai di renderer Next.js agar TypeScript mengenali API Electron.
 */
export interface ElectronAPI {
  app: {
    getVersion: () => Promise<string>;
    isPackaged: () => Promise<boolean>;
    getPath: (name: string) => Promise<string | null>;
  };
  printer: {
    print: (data: ReceiptData) => Promise<{ ok: boolean; error?: string }>;
    test: () => Promise<{ ok: boolean; error?: string }>;
    status: () => Promise<{ ok: boolean; error?: string }>;
    getConfig: () => Promise<PrinterConfig | null>;
    saveConfig: (config: PrinterConfig) => Promise<{ ok: true }>;
    loadConfig: () => Promise<PrinterConfig | null>;
  };
  whatsapp: {
    status: () => Promise<{
      status: string;
      qrDataUrl: string | null;
      lastError: string | null;
      hasClient: boolean;
    }>;
    start: () => Promise<{
      status: string;
      qrDataUrl: string | null;
      lastError: string | null;
      hasClient: boolean;
    }>;
    restart: () => Promise<{
      status: string;
      qrDataUrl: string | null;
      lastError: string | null;
      hasClient: boolean;
    }>;
    logout: () => Promise<{
      status: string;
      qrDataUrl: string | null;
      lastError: string | null;
      hasClient: boolean;
    }>;
    send: (payload: {
      to: string;
      message: string;
      token?: string;
      expiresAt?: number;
    }) => Promise<{ ok: boolean; error?: string }>;
  };
  update: {
    check: () => Promise<{
      version?: string;
      error?: string;
      simulated?: boolean;
    } | null>;
    simulate: (
      version?: string,
    ) => Promise<{
      version?: string;
      error?: string;
      simulated?: boolean;
      downloaded?: boolean;
    }>;
    install: () => Promise<boolean | { ok: boolean; simulated?: boolean }>;
    onUpdateAvailable: (
      cb: (info: { version: string; releaseNotes?: string }) => void,
    ) => () => void;
    onUpdateDownloaded: (cb: (info: { version: string }) => void) => () => void;
    onUpdateProgress: (
      cb: (p: { percent: number; transferred: number; total: number }) => void,
    ) => () => void;
    onUpdateError: (cb: (e: { message: string }) => void) => () => void;
    onUpdateNotAvailable: (cb: () => void) => () => void;
    onUpdateSimulatedInstalled: (cb: () => void) => () => void;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<boolean | undefined>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  printReceipt: (data: ReceiptData) => Promise<{ ok: boolean; error?: string }>;
}

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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
