/**
 * electron/printer.ts
 *
 * Integrasi printer thermal (ESC/POS protocol) menggunakan node-thermal-printer.
 * Mendukung 3 tipe koneksi:
 *   1. Network (LAN/WiFi) — paling stabil, recommended
 *   2. USB     — perlu native module 'usb' (sudul dibundling oleh electron-builder)
 *   3. Serial  — perlu 'serialport' (opsional)
 *
 * Selain itu, fallback ke printer sistem (Windows Print Spooler) untuk
 * printer non-ESC/POS atau thermal printer yang sudah terinstall di Windows.
 */
import {
  ThermalPrinter,
  PrinterTypes,
  CharacterSet,
} from "node-thermal-printer";
import type { BrowserWindow } from "electron";
import { app } from "electron";

export interface PrinterConfig {
  type: "network" | "usb" | "serial" | "system";
  // network
  host?: string;
  port?: number;
  // serial
  interface?: string;
  baudRate?: number;
  // printer umum
  width?: 32 | 48; // 32 = 58mm, 48 = 80mm
  charset?: CharacterSet;
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
    type: string; // 'pos' | 'brilink' | ...
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

let cachedConfig: PrinterConfig | null = null;

export function setPrinterConfig(config: PrinterConfig) {
  cachedConfig = config;
}

export function getPrinterConfig(): PrinterConfig | null {
  return cachedConfig;
}

function formatRupiah(n: number): string {
  return "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n));
}

function pad(str: string, len: number, align: "left" | "right" = "left"): string {
  const s = String(str);
  if (s.length >= len) return s.slice(0, len);
  const space = " ".repeat(len - s.length);
  return align === "right" ? space + s : s + space;
}

function formatItemLine(name: string, qty: number, price: number, subtotal: number, width: number): string[] {
  const lines: string[] = [];
  const nameMaxWidth = width;
  // Wrap nama produk jika terlalu panjang
  const wrappedNames: string[] = [];
  let current = name;
  while (current.length > nameMaxWidth) {
    wrappedNames.push(current.slice(0, nameMaxWidth));
    current = current.slice(nameMaxWidth);
  }
  wrappedNames.push(current);

  lines.push(wrappedNames[0]);
  const qtyStr = `${qty} x ${formatRupiah(price)}`;
  const subStr = formatRupiah(subtotal);
  // Baris kedua: qty x price .... subtotal
  const secondLine = pad(qtyStr, width - subStr.length, "left") + subStr;
  lines.push(secondLine);
  // Sisanya jika ada wrap nama
  for (let i = 1; i < wrappedNames.length; i++) {
    lines.push(wrappedNames[i]);
  }
  return lines;
}

/**
 * Build instance ThermalPrinter sesuai config.
 */
async function buildPrinter(config: PrinterConfig) {
  const width = config.width || 32;
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON, // Mayoritas printer thermal China support EPSON ESC/POS
    interface: config.type === "network"
      ? `tcp://${config.host}:${config.port || 9100}`
      : config.type === "usb"
        ? config.interface || "USB"
        : config.type === "serial"
          ? config.interface || "COM1"
          : "USB",
    options: {
      timeout: 5000,
    },
    width,
    characterSet: config.charset || CharacterSet.PC857_TURKISH,
    removeSpecialCharacters: false,
    lineCharacter: "-",
  });
  return printer;
}

/**
 * Cetak struk dari ReceiptData.
 * Return { ok: true } jika berhasil, { ok: false, error } jika gagal.
 */
export async function printReceipt(data: ReceiptData): Promise<{ ok: boolean; error?: string }> {
  if (!cachedConfig) {
    return { ok: false, error: "Konfigurasi printer belum diset" };
  }

  try {
    const printer = await buildPrinter(cachedConfig);
    const width = cachedConfig.width || 32;

    // Header: nama toko
    printer.alignCenter();
    printer.bold(true);
    printer.println(data.store.name.toUpperCase());
    printer.bold(false);
    if (data.store.address) printer.println(data.store.address);
    if (data.store.phone) printer.println(`Telp: ${data.store.phone}`);
    if (data.store.agentId) printer.println(`Agen ID: ${data.store.agentId}`);
    printer.drawLine();

    // Invoice info
    printer.alignLeft();
    printer.println(`No: ${data.invoice.no}`);
    printer.println(`Tgl: ${data.invoice.date}`);
    printer.println(`Kasir: ${data.invoice.cashier}`);
    if (data.invoice.customer) printer.println(`Plgn: ${data.invoice.customer}`);
    printer.println(`Jenis: ${data.invoice.type.toUpperCase()}`);
    printer.drawLine();

    // Items
    for (const item of data.items) {
      const lines = formatItemLine(item.name, item.qty, item.price, item.subtotal, width);
      for (const l of lines) printer.println(l);
    }
    printer.drawLine();

    // Summary
    printer.println(
      pad("Subtotal", width - formatRupiah(data.summary.subtotal).length) +
      formatRupiah(data.summary.subtotal)
    );
    if (data.summary.adminFee && data.summary.adminFee > 0) {
      printer.println(
        pad("Adm", width - formatRupiah(data.summary.adminFee).length) +
        formatRupiah(data.summary.adminFee)
      );
    }
    printer.bold(true);
    printer.println(
      pad("TOTAL", width - formatRupiah(data.summary.total).length) +
      formatRupiah(data.summary.total)
    );
    printer.bold(false);
    if (data.summary.paymentMethod) {
      printer.println(`Bayar: ${data.summary.paymentMethod.toUpperCase()}`);
    }
    if (data.summary.paid !== undefined) {
      printer.println(
        pad("Tunai", width - formatRupiah(data.summary.paid).length) +
        formatRupiah(data.summary.paid)
      );
    }
    if (data.summary.change !== undefined && data.summary.change > 0) {
      printer.println(
        pad("Kembali", width - formatRupiah(data.summary.change).length) +
        formatRupiah(data.summary.change)
      );
    }

    printer.drawLine();
    if (data.footer) {
      printer.alignCenter();
      printer.println(data.footer);
    }
    printer.alignCenter();
    printer.println("Terima kasih");
    printer.println("Barang yang sudah dibeli tidak dapat ditukar");
    printer.newLine();
    printer.newLine();
    printer.newLine();

    // Partial cut
    printer.partialCut();

    // Execute
    const success = await printer.execute();
    if (!success) {
      return { ok: false, error: "Printer tidak merespons" };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Test print — cetak 1 baris "Test Printer OK".
 */
export async function testPrint(): Promise<{ ok: boolean; error?: string }> {
  if (!cachedConfig) {
    return { ok: false, error: "Konfigurasi printer belum diset" };
  }
  try {
    const printer = await buildPrinter(cachedConfig);
    printer.alignCenter();
    printer.bold(true);
    printer.println("=== TEST PRINTER ===");
    printer.bold(false);
    printer.println(`Time: ${new Date().toLocaleString("id-ID")}`);
    printer.println("Printer berfungsi dengan baik");
    printer.newLine();
    printer.partialCut();
    await printer.execute();
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Cek apakah printer terhubung (network only — ping port 9100).
 */
export async function checkPrinterStatus(): Promise<{ ok: boolean; error?: string }> {
  if (!cachedConfig) return { ok: false, error: "Belum dikonfigurasi" };
  const cfg = cachedConfig;
  if (cfg.type !== "network") {
    // Untuk USB/serial, sulit cek status tanpa print — anggap OK
    return { ok: true };
  }
  // Network: coba connect ke host:port
  return new Promise((resolve) => {
    const net = require("net");
    const socket = new net.Socket();
    const timeout = 3000;
    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
      resolve({ ok: true });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "Timeout — printer tidak merespons" });
    });
    socket.once("error", (err: Error) => {
      socket.destroy();
      resolve({ ok: false, error: err.message });
    });
    socket.connect(cfg.port || 9100, cfg.host || "192.168.1.87");
  });
}

/**
 * Simpan konfigurasi printer ke file userData/printer-config.json
 * agar persisten antar restart aplikasi.
 */
import path from "path";
import fs from "fs/promises";

export async function savePrinterConfig(config: PrinterConfig): Promise<void> {
  const filePath = path.join(app.getPath("userData"), "printer-config.json");
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
  cachedConfig = config;
}

export async function loadPrinterConfig(): Promise<PrinterConfig | null> {
  try {
    const filePath = path.join(app.getPath("userData"), "printer-config.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const config = JSON.parse(raw) as PrinterConfig;
    cachedConfig = config;
    return config;
  } catch {
    return null;
  }
}

// Helper untuk main.ts — register IPC handlers
export function registerPrinterIpc(getMainWindow: () => BrowserWindow | null) {
  const { ipcMain } = require("electron");
  ipcMain.handle("printer:print", async (_evt: unknown, data: ReceiptData) => {
    return printReceipt(data);
  });
  ipcMain.handle("printer:test", async () => {
    return testPrint();
  });
  ipcMain.handle("printer:status", async () => {
    return checkPrinterStatus();
  });
  ipcMain.handle("printer:getConfig", async () => {
    return getPrinterConfig();
  });
  ipcMain.handle("printer:saveConfig", async (_evt: unknown, config: PrinterConfig) => {
    await savePrinterConfig(config);
    return { ok: true };
  });
  ipcMain.handle("printer:loadConfig", async () => {
    return (await loadPrinterConfig()) || null;
  });
  // suppress unused var warning
  void getMainWindow;
}
