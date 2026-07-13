/**
 * electron/main.ts
 *
 * Main process Electron.
 *
 * Mode operasi:
 * 1. DEV (ELECTRON_DEV=1): Electron load http://localhost:3000
 *    - Next.js dev server dijalankan terpisah (via `npm run dev:electron` → `next dev`)
 *    - Tidak spawn standalone server
 *    - Hot reload berfungsi penuh
 *
 * 2. PRODUCTION (app.isPackaged): Spawn Next.js standalone server di port 43219
 *    - Load http://127.0.0.1:43219
 *    - Database: %APPDATA%/BRILink POS/pos-brilink.db (persistent)
 *
 * 3. FALLBACK (electron . tanpa dev server & tanpa build):
 *    - Tampilkan pesan error yang informatif
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

// Port internal untuk Next.js standalone server (production only)
const INTERNAL_PORT = 43219;
// Port Next.js dev server (development)
const DEV_PORT = 3000;

let nextServer: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// ── Mode detection ───────────────────────────────
const isDevMode = process.env.ELECTRON_DEV === "1";
const isPackaged = app.isPackaged;

// ── Setup DATABASE_URL SEBELUM spawn Next.js ─────
// Hanya apply di production (di dev, Next.js pakai .env.local atau default)
if (isPackaged) {
  applyDatabaseUrl();
}

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

// ── Spawn Next.js standalone server (production only) ──
async function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const resourcesPath = process.resourcesPath;
    const serverPath = path.join(resourcesPath, "standalone", "server.js");
    const cwd = path.join(resourcesPath, "standalone");

    if (!existsSync(serverPath)) {
      reject(
        new Error(
          `Next.js standalone server tidak ditemukan di:\n${serverPath}\n\nAplikasi mungkin corrupt. Coba reinstall.`
        )
      );
      return;
    }

    console.log(`[main] Starting Next.js server from ${serverPath}`);

    nextServer = spawn(process.execPath, [serverPath], {
      cwd,
      env: {
        ...process.env,
        PORT: String(INTERNAL_PORT),
        NODE_ENV: "production",
        ELECTRON_RUN_AS_NODE: undefined,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextServer.stdout?.on("data", (data) => {
      const msg = data.toString();
      console.log(`[next] ${msg.trim()}`);
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

    // Safety timeout
    setTimeout(() => resolve(), 30000);
  });
}

// ── Tunggu port siap ─────────────────────────────
async function waitForPort(port: number, maxRetries = 60, intervalMs = 500): Promise<void> {
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
        socket.connect(port, "127.0.0.1");
      });
      if (ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Tidak dapat terhubung ke port ${port} dalam ${maxRetries * intervalMs / 1000} detik`);
}

// ── URL untuk load ───────────────────────────────
function getLoadUrl(): string {
  if (isDevMode) {
    return `http://localhost:${DEV_PORT}`;
  }
  return `http://127.0.0.1:${INTERNAL_PORT}`;
}

// ── Buat main window ─────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#4f46e5",
    show: false,
    title: "POS & Agen Bisnis",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      // Disable source map loading di production untuk hindari 404 warning
      ...(isPackaged ? { devTools: false } : {}),
    },
  });

  // ── Content Security Policy ───────────────────
  // Set CSP header untuk semua request di app shell.
  // Di DEV: allow localhost + ws (hot reload) + eval (Next.js dev).
  // Di PROD: stricter — hanya allow self + inline styles.
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const devSrc = isDevMode
      ? " http://localhost:3000 ws://localhost:3000 'unsafe-eval'"
      : "";
    const csp = [
      "default-src 'self'",
      `script-src 'self'${devSrc}`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' http://localhost:* http://127.0.0.1:*",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    const responseHeaders: Record<string, string> = { ...details.responseHeaders as Record<string, string> };
    responseHeaders["Content-Security-Policy"] = csp;
    callback({ responseHeaders });
  });

  Menu.setApplicationMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (isDevMode) {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Auto-update init (production only)
  if (isPackaged) {
    initAutoUpdater(mainWindow);
    startUpdateCheck(10000);
  }
}

// ── Tampilkan window error ───────────────────────
function showErrorWindow(errorMessage: string) {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 480,
    title: "BRILink POS - Error",
    backgroundColor: "#fef2f2",
  });
  mainWindow.loadURL(
    "data:text/html," +
      encodeURIComponent(
        `<html><head><meta charset="utf-8"><style>
          body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; background: #fef2f2; color: #991b1b; }
          h1 { color: #dc2626; margin-bottom: 16px; font-size: 20px; }
          p { line-height: 1.6; margin-bottom: 12px; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
          code { background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #fecaca; font-size: 12px; color: #7f1d1d; }
        </style></head><body>
          <h1>Gagal Memulai Aplikasi</h1>
          <p>${errorMessage}</p>
          <div class="footer">
            <strong>Solusi:</strong><br>
            • Mode Development: jalankan <code>npm run dev:electron</code> (bukan <code>electron .</code> langsung)<br>
            • Mode Production: jalankan <code>npm run build:electron</code> untuk build installer<br>
            • Jika sudah build, coba reinstall aplikasi
          </div>
        </body></html>`
      )
  );
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
  await loadPrinterConfig();

  // ── Mode DEV: langsung load Next.js dev server ──
  if (isDevMode) {
    console.log("[main] Mode DEV: connecting to Next.js dev server at http://localhost:" + DEV_PORT);
    try {
      // Tunggu Next.js dev server siap (di-spawn oleh concurrently di package.json)
      await waitForPort(DEV_PORT, 120, 1000); // 120 detik timeout (Next.js dev butuh compile)
      createWindow();
      mainWindow?.loadURL(getLoadUrl());
    } catch (err) {
      console.error("[main] Next.js dev server tidak siap:", err);
      showErrorWindow(
        `Tidak dapat terhubung ke Next.js dev server di http://localhost:${DEV_PORT}.\n\n` +
        `Pastikan Anda menjalankan 'npm run dev:electron' (bukan 'electron .' langsung),\n` +
        `atau jalankan 'npm run dev' di terminal terpisah dahulu.`
      );
    }
    return;
  }

  // ── Mode PRODUCTION: spawn standalone server ──
  try {
    await startNextServer();
    await waitForPort(INTERNAL_PORT);
    createWindow();
    mainWindow?.loadURL(getLoadUrl());
  } catch (err) {
    console.error("[main] Gagal start Next.js:", err);
    showErrorWindow(
      err instanceof Error ? err.message : String(err)
    );
  }
});

app.on("window-all-closed", () => {
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
    if (isDevMode) {
      // Di dev mode, cek apakah dev server jalan
      waitForPort(DEV_PORT, 10, 500)
        .then(() => {
          createWindow();
          mainWindow?.loadURL(getLoadUrl());
        })
        .catch(() => {
          showErrorWindow("Next.js dev server tidak siap.");
        });
    } else if (nextServer) {
      createWindow();
      mainWindow?.loadURL(getLoadUrl());
    }
  }
});
