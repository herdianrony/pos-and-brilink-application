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
let simulatedUpdateDownloaded = false;
let simulationRunning = false;

function isUpdateSimulationEnabled() {
  return (
    process.env.ELECTRON_UPDATE_SIMULATION === "1" ||
    process.env.UPDATE_SIMULATION === "1"
  );
}

function getSimulationVersion() {
  return process.env.ELECTRON_UPDATE_SIMULATION_VERSION || "999.0.0-simulasi";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulasi update untuk QA/demo tanpa benar-benar mengunduh installer.
 * Dipakai untuk memastikan UI update Electron, IPC listener, dan tombol install
 * berjalan sebelum release GitHub sungguhan diterbitkan.
 */
export async function simulateUpdate(version = getSimulationVersion()) {
  if (simulationRunning) return { version, simulated: true, running: true };
  simulationRunning = true;
  simulatedUpdateDownloaded = false;

  try {
    sendToRenderer("update:checking", {});
    await wait(500);

    const info = {
      version,
      releaseNotes:
        "Simulasi update Electron. Tidak ada file installer yang benar-benar diunduh.",
    };
    updateAvailable = info;
    sendToRenderer("update:available", info);

    for (const percent of [10, 25, 45, 65, 85, 100]) {
      await wait(250);
      sendToRenderer("update:progress", {
        percent,
        transferred: Math.round((percent / 100) * 50 * 1024 * 1024),
        total: 50 * 1024 * 1024,
        bytesPerSecond: 8 * 1024 * 1024,
        simulated: true,
      });
    }

    simulatedUpdateDownloaded = true;
    sendToRenderer("update:downloaded", { version, simulated: true });
    return { version, simulated: true, downloaded: true };
  } finally {
    simulationRunning = false;
  }
}

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
      await checkForUpdatesNow();
    } catch (err) {
      // Silent fail — jangan ganggu user saat startup
      console.error("Update check failed:", err);
    }
  }, delay);
}

export async function checkForUpdatesNow() {
  if (isUpdateSimulationEnabled()) return simulateUpdate();

  const result = await autoUpdater.checkForUpdates();
  if (!result) {
    sendToRenderer("update:not-available", {});
    return null;
  }
  return { version: result.updateInfo.version };
}

/**
 * Install update yang sudah didownload — dipanggil dari renderer
 * lewat IPC saat user klik tombol "Install Sekarang".
 */
export function quitAndInstall() {
  if (simulatedUpdateDownloaded) {
    simulatedUpdateDownloaded = false;
    sendToRenderer("update:simulated-installed", { ok: true });
    return { ok: true, simulated: true };
  }
  autoUpdater.quitAndInstall(true, true);
  return { ok: true };
}

function sendToRenderer(channel: string, payload: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}
