/**
 * electron/main.ts
 *
 * Main process Electron.
 * - Spawn Next.js standalone server sebagai child process
 * - Buat BrowserWindow yang load http://localhost:PORT
 * - Register IPC untuk printer, window controls, auto-update
 * - Apply DATABASE_URL dari userData path sebelum spawn server
 *
 * Build pipeline:
 *   1. next build           → .next/standalone/ (self-contained server)
 *   2. electron-builder     → bundle electron + standalone + assets
 */
import { app, BrowserWindow, ipcMain, shell, Menu } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { applyDatabaseUrl } from "./db-path";
import { registerPrinterIpc, loadPrinterConfig } from "./printer";
import { initAutoUpdater, startUpdateCheck, quitAndInstall } from "./updater";

// Port internal untuk Next.js server (acak untuk hindari konflik)
const INTERNAL_PORT = 43219;
let nextServer: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// ── Setup DATABASE_URL SEBELUM spawn Next.js ─────
applyDatabaseUrl();

// ── Single instance lock ─────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Spawn Next.js standalone server ──────────────
async function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    let serverPath: string;
    let cwd: string;

    if (app.isPackaged) {
      // Production: standalone server ada di resources/app/standalone/server.js
      const resourcesPath = process.resourcesPath;
      serverPath = path.join(resourcesPath, "standalone", "server.js");
      cwd = path.join(resourcesPath, "standalone");
    } else {
      // Development: standalone server di .next/standalone/server.js
      serverPath = path.join(__dirname, "..", ".next", "standalone", "server.js");
      cwd = path.join(__dirname, "..", ".next", "standalone");
    }

    if (!existsSync(serverPath)) {
      reject(new Error(`Next.js standalone server tidak ditemukan di ${serverPath}. Jalankan 'npm run build' dulu.`));
      return;
    }

    console.log(`[main] Starting Next.js server from ${serverPath}`);

    nextServer = spawn(process.execPath, [serverPath], {
      cwd,
      env: {
        ...process.env,
        PORT: String(INTERNAL_PORT),
        NODE_ENV: "production",
        // DATABASE_URL sudah diset oleh applyDatabaseUrl()
        ELECTRON_RUN_AS_NODE: undefined, // pastikan tidak set
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextServer.stdout?.on("data", (data) => {
      const msg = data.toString();
      console.log(`[next] ${msg.trim()}`);
      // Resolve saat server siap
      if (msg.includes("Ready") || msg.includes("started server")) {
        resolve();
      }
    });

    nextServer.stderr?.on("data", (data) => {
      console.error(`[next:err] ${data.toString().trim()}`);
    });

    nextServer.on("error", (err) => {
      console.error("[main] Failed to start Next.js server:", err);
      reject(err);
    });

    nextServer.on("exit", (code) => {
      console.log(`[main] Next.js server exited with code ${code}`);
      nextServer = null;
    });

    // Safety timeout — anggap server siap dalam 30 detik
    setTimeout(() => resolve(), 30000);
  });
}

// ── Tunggu Next.js ready ─────────────────────────
async function waitForNext(maxRetries = 60, intervalMs = 500): Promise<void> {
  const net = require("net");
  for (let i = 0; i < maxRetries; i++) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.once("connect", () => {
          socket.destroy();
          resolve(true);
        });
        socket.once("error", () => {
          socket.destroy();
          resolve(false);
        });
        socket.once("timeout", () => {
          socket.destroy();
          resolve(false);
        });
        socket.connect(INTERNAL_PORT, "127.0.0.1");
      });
      if (ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Next.js server tidak siap dalam ${maxRetries * intervalMs / 1000} detik`);
}

// ── Buat main window ─────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#003d79",
    show: false, // tampilkan setelah ready-to-show
    title: "BRILink POS",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  // Hapus menu bar default (File/Edit/View/...) untuk UX kios POS
  Menu.setApplicationMenu(null);

  // External link → buka di browser default
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (process.env.ELECTRON_DEV === "1") {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Auto-update init
  initAutoUpdater(mainWindow);
  startUpdateCheck(10000); // cek 10 detik setelah start
}

// ── IPC handlers ─────────────────────────────────
function registerAppIpc() {
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:isPackaged", () => app.isPackaged);
  ipcMain.handle("app:getPath", (_evt, name: string) => {
    try {
      return app.getPath(name as any);
    } catch {
      return null;
    }
  });

  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:maximize", () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle("window:close", () => mainWindow?.close());
  ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() || false);

  ipcMain.handle("update:check", async () => {
    const { autoUpdater } = require("electron-updater");
    try {
      const result = await autoUpdater.checkForUpdates();
      return result ? { version: result.updateInfo.version } : null;
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
  ipcMain.handle("update:install", () => {
    quitAndInstall();
    return true;
  });
}

// ── App lifecycle ────────────────────────────────
app.whenReady().then(async () => {
  registerAppIpc();
  registerPrinterIpc(() => mainWindow);
  await loadPrinterConfig(); // load saved printer config

  try {
    await startNextServer();
    await waitForNext();
  } catch (err) {
    console.error("[main] Gagal start Next.js:", err);
    // Tampilkan window error
    mainWindow = new BrowserWindow({ width: 600, height: 400 });
    mainWindow.loadURL(
      "data:text/html," +
        encodeURIComponent(
          `<html><body style="font-family:sans-serif;padding:40px"><h1>Gagal Memulai</h1><p>${err instanceof Error ? err.message : String(err)}</p><p>Pastikan aplikasi tidak corrupt. Coba reinstall.</p></body></html>`
        )
    );
    return;
  }

  createWindow();
  mainWindow?.loadURL(`http://127.0.0.1:${INTERNAL_PORT}`);
});

app.on("window-all-closed", () => {
  // POS app: tutup sepenuhnya saat window ditutup (tidak stay di dock macOS)
  if (nextServer) {
    nextServer.kill("SIGTERM");
    nextServer = null;
  }
  app.quit();
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill("SIGTERM");
    nextServer = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    mainWindow?.loadURL(`http://127.0.0.1:${INTERNAL_PORT}`);
  }
});
