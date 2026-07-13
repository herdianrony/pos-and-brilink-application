/**
 * electron/updater.ts
 *
 * Auto-update menggunakan electron-updater.
 * - Cek update otomatis saat app start (delay 10 detik)
 * - Download update di background
 * - Tampilkan notifikasi ke user via BrowserWindow webContents
 * - Install saat user klik "Install" atau saat app ditutup
 *
 * Untuk produksi: publish ke GitHub Releases dengan asset:
 *   pos-brilink-pos-Setup-x.y.z.exe
 *   pos-brilink-pos-x.y.z.exe (portable)
 *   latest.yml (auto-generated oleh electron-builder)
 */
import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;
let updateAvailable: { version: string; releaseNotes?: string } | null = null;

export function initAutoUpdater(window: BrowserWindow) {
  mainWindow = window;

  // Konfigurasi
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // Supaya tidak crash saat development (tidak ada app-update.yml)
  autoUpdater.allowDowngrade = false;

  // ── Event listeners ─────────────────────────────
  autoUpdater.on("checking-for-update", () => {
    sendToRenderer("update:checking", {});
  });

  autoUpdater.on("update-available", (info) => {
    updateAvailable = {
      version: info.version,
      releaseNotes:
        typeof info.releaseNotes === "string"
          ? info.releaseNotes
          : Array.isArray(info.releaseNotes)
            ? info.releaseNotes.map((n) => n.note).join("\n")
            : undefined,
    };
    sendToRenderer("update:available", updateAvailable);
  });

  autoUpdater.on("update-not-available", () => {
    sendToRenderer("update:not-available", {});
  });

  autoUpdater.on("download-progress", (progress) => {
    sendToRenderer("update:progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendToRenderer("update:downloaded", {
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err);
    sendToRenderer("update:error", { message: err?.message || String(err) });
  });
}

/**
 * Mulai cek update — dipanggil dari main.ts setelah app ready.
 * Delay 10 detik agar tidak mengganggu startup.
 */
export function startUpdateCheck(delay = 10000) {
  setTimeout(async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (!result) {
        sendToRenderer("update:not-available", {});
      }
    } catch (err) {
      // Silent fail — jangan ganggu user saat startup
      console.error("Update check failed:", err);
    }
  }, delay);
}

/**
 * Install update yang sudah didownload — dipanggil dari renderer
 * lewat IPC saat user klik tombol "Install Sekarang".
 */
export function quitAndInstall() {
  autoUpdater.quitAndInstall(true, true);
}

function sendToRenderer(channel: string, payload: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}
