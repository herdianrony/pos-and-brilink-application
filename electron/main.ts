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
import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import fs from "fs";
import { applyDatabaseUrl } from "./db-path";
import { registerPrinterIpc, loadPrinterConfig } from "./printer";
import {
  initAutoUpdater,
  startUpdateCheck,
  quitAndInstall,
  checkForUpdatesNow,
  simulateUpdate,
} from "./updater";
import { registerWhatsAppIpc } from "./whatsapp";

// Port internal untuk Next.js standalone server (production only)
const INTERNAL_PORT = 43219;
const ALLOWED_APP_PATHS = new Set(["userData", "documents", "desktop"]);
// Port Next.js dev server (development)
const DEV_PORT = 3000;
const WHATSAPP_REMOTE_DEBUGGING_PORT = 43220;

let nextServer: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// ── Mode detection ───────────────────────────────
const isDevMode = process.env.ELECTRON_DEV === "1";
const isPackaged = app.isPackaged;

function prepareElectronRemoteDebugging() {
  // wwebjs-electron attaches Puppeteer to Electron through Chromium remote debugging.
  // Electron 43 on some Windows installations does not reliably create/read
  // DevToolsActivePort when using port=0. Use a deterministic local port and
  // write the port file expected by wwebjs-electron before app.whenReady().
  try {
    const port = String(WHATSAPP_REMOTE_DEBUGGING_PORT);
    process.env.WHATSAPP_ELECTRON_DEBUG_PORT = port;
    app.commandLine.appendSwitch("remote-debugging-port", port);
    app.commandLine.appendSwitch("remote-allow-origins", "*");

    const userDataPath = app.getPath("userData");
    fs.mkdirSync(userDataPath, { recursive: true });
    const portFile = path.join(userDataPath, "DevToolsActivePort");
    fs.writeFileSync(
      portFile,
      `${port}
`,
      { mode: 0o600 },
    );
    console.log(
      `[main] WhatsApp Electron remote debugging prepared on port ${port}`,
    );
  } catch (error) {
    console.warn(
      "[main] Could not prepare Electron remote debugging for WhatsApp:",
      error,
    );
  }
}

prepareElectronRemoteDebugging();

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

function findWhatsAppBrowserExecutable(): string | undefined {
  const candidates: string[] = [];

  if (process.env.WHATSAPP_BROWSER_PATH) {
    candidates.push(process.env.WHATSAPP_BROWSER_PATH);
  }

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
    const programFilesX86 =
      process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    candidates.push(
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(
        programFilesX86,
        "Microsoft",
        "Edge",
        "Application",
        "msedge.exe",
      ),
      path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(
        programFilesX86,
        "Google",
        "Chrome",
        "Application",
        "chrome.exe",
      ),
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    );
  }

  const found = candidates.find(
    (candidate) => candidate && fs.existsSync(candidate),
  );
  if (found) console.log(`[main] WhatsApp browser executable: ${found}`);
  else
    console.warn(
      "[main] WhatsApp browser executable not found; puppeteer will use its default browser if available.",
    );
  return found;
}

// ── Spawn Next.js standalone server (production only) ──
async function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const resourcesPath = process.resourcesPath;
    const serverPath = path.join(resourcesPath, "standalone", "server.js");
    const cwd = path.join(resourcesPath, "standalone");

    if (!existsSync(serverPath)) {
      reject(
        new Error(
          `Next.js standalone server tidak ditemukan di:\n${serverPath}\n\nAplikasi mungkin corrupt. Coba reinstall.`,
        ),
      );
      return;
    }

    console.log(`[main] Starting Next.js server from ${serverPath}`);
    console.log(`[main] CWD: ${cwd}`);
    console.log(`[main] PORT: ${INTERNAL_PORT}`);
    console.log(`[main] execPath: ${process.execPath}`);

    // ── PENTING: ELECTRON_RUN_AS_NODE + Security ───
    // process.execPath di packaged Electron = path ke "BRILink POS.exe"
    // (Electron executable, BUKAN Node.js). Tanpa ELECTRON_RUN_AS_NODE=1,
    // Electron akan mencoba menjalankan server.js sebagai GUI app → crash.
    // Dengan ELECTRON_RUN_AS_NODE=1, Electron executable berperilaku sebagai
    // Node.js runtime, sehingga server.js bisa dijalankan dengan benar.

    // ── AUTH_SECRET: generate per instalasi (C-01 fix) ──
    // Secret di-generate random saat first run, disimpan di userData,
    // dipakai untuk semua session. Tidak ada default yang predictable.
    const crypto = require("crypto");
    const fs = require("fs");
    const secretPath = path.join(app.getPath("userData"), ".auth-secret");
    let authSecret = "";
    try {
      if (fs.existsSync(secretPath)) {
        authSecret = fs.readFileSync(secretPath, "utf-8").trim();
      }
      if (!authSecret || authSecret.length < 32) {
        authSecret = crypto.randomBytes(48).toString("hex");
        fs.writeFileSync(secretPath, authSecret, { mode: 0o600 });
        console.log("[main] Generated new AUTH_SECRET");
      }
    } catch (e) {
      // Fallback: generate per-process (less ideal, sessions reset on restart)
      authSecret = crypto.randomBytes(48).toString("hex");
      console.error("[main] Failed to persist AUTH_SECRET:", e);
    }

    process.env.AUTH_SECRET = authSecret;

    const appLogDir = path.join(app.getPath("userData"), "logs");
    const whatsappSessionDir = path.join(
      app.getPath("userData"),
      "whatsapp-session",
    );
    const whatsappBrowserPath = findWhatsAppBrowserExecutable();

    const spawnEnv: Record<string, string | undefined> = {
      ...process.env,
      PORT: String(INTERNAL_PORT),
      HOSTNAME: "127.0.0.1", // C-01: bind ke loopback only, BUKAN 0.0.0.0
      NODE_ENV: "production",
      ELECTRON_RUN_AS_NODE: "1",
      ELECTRON_SECURE_WARNINGS: "1",
      AUTH_SECRET: authSecret, // C-01: secret unik per instalasi
      WHATSAPP_SESSION_DIR: whatsappSessionDir,
      WHATSAPP_BROWSER_PATH: whatsappBrowserPath,
      APP_LOG_DIR: appLogDir,
      PATH: process.env.PATH,
    };

    // ── Buat log file untuk debug ─────────────────
    const logDir = appLogDir;
    try {
      const fs = require("fs");
      fs.mkdirSync(logDir, { recursive: true });
    } catch {
      // ignore
    }
    const logFile = path.join(logDir, "next-server.log");
    console.log(`[main] Log file: ${logFile}`);

    let logContent = `[${new Date().toISOString()}] Starting Next.js server\n`;
    logContent += `execPath: ${process.execPath}\n`;
    logContent += `serverPath: ${serverPath}\n`;
    logContent += `cwd: ${cwd}\n`;
    logContent += `PORT: ${INTERNAL_PORT}\n\n`;

    nextServer = spawn(process.execPath, [serverPath], {
      cwd,
      env: spawnEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let resolved = false;
    const writeLog = (msg: string) => {
      logContent += msg + "\n";
      try {
        const fs = require("fs");
        fs.writeFileSync(logFile, logContent);
      } catch {
        // ignore
      }
    };

    nextServer.stdout?.on("data", (data) => {
      const msg = data.toString();
      console.log(`[next] ${msg.trim()}`);
      writeLog(`[stdout] ${msg}`);
      if (
        !resolved &&
        (msg.includes("Ready") ||
          msg.includes("started server") ||
          msg.includes("Local:"))
      ) {
        resolved = true;
        resolve();
      }
    });

    nextServer.stderr?.on("data", (data) => {
      const msg = data.toString();
      console.error(`[next:err] ${msg.trim()}`);
      writeLog(`[stderr] ${msg}`);
    });

    nextServer.on("error", (err) => {
      console.error("[main] Failed to start Next.js server:", err);
      writeLog(`[ERROR] ${err.message}\n${err.stack || ""}`);
      if (!resolved) {
        resolved = true;
        reject(
          new Error(
            `Gagal start Next.js server: ${err.message}\n\n` +
              `Kemungkinan penyebab:\n` +
              `• Antivirus memblokir eksekusi\n` +
              `• Permission denied\n` +
              `• Aplikasi corrupt\n\n` +
              `Log file: ${logFile}`,
          ),
        );
      }
    });

    nextServer.on("exit", (code) => {
      console.log(`[main] Next.js server exited with code ${code}`);
      writeLog(`[EXIT] code=${code}`);
      nextServer = null;
      if (!resolved && code !== 0) {
        resolved = true;
        reject(
          new Error(
            `Next.js server exit dengan kode ${code}. Mungkin ada error di startup.\n\n` +
              `Kemungkinan penyebab:\n` +
              `• File static assets (.next/static) atau public/ tidak ada\n` +
              `• Database permission denied\n` +
              `• Port ${INTERNAL_PORT} sudah dipakai\n` +
              `• Module not found\n\n` +
              `Log file: ${logFile}`,
          ),
        );
      }
    });

    // Safety timeout — 60 detik (Next.js standalone butuh waktu compile di first run)
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(); // lanjut ke waitForPort yang akan cek koneksi
      }
    }, 60000);
  });
}

// ── Tunggu port siap ─────────────────────────────
async function waitForPort(
  port: number,
  maxRetries = 120,
  intervalMs = 500,
): Promise<void> {
  const net = require("net");
  const http = require("http");
  const maxSeconds = (maxRetries * intervalMs) / 1000;

  // Phase 1: TCP connect check
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
      if (ok) {
        console.log(
          `[main] TCP port ${port} siap setelah ${(i * intervalMs) / 1000}s`,
        );
        break;
      }
    } catch {
      /* ignore */
    }
    if (i === maxRetries - 1) {
      throw new Error(`TCP port ${port} tidak siap dalam ${maxSeconds} detik`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  // Phase 2: HTTP health check (pastikan server siap serve request)
  for (let i = 0; i < 30; i++) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const req = http.get(
          `http://127.0.0.1:${port}/api/health`,
          (res: any) => {
            res.destroy();
            resolve(res.statusCode === 200);
          },
        );
        req.setTimeout(2000);
        req.on("error", () => resolve(false));
        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) {
        console.log(`[main] HTTP health check OK setelah ${(i * 500) / 1000}s`);
        return;
      }
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.warn("[main] HTTP health check timeout — lanjutkan anyway");
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
    backgroundColor: "#0f172a",
    show: false,
    title: "POS & Agen Bisnis",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // F-07: enable sandbox for renderer isolation
      spellcheck: false,
      // Disable source map loading di production untuk hindari 404 warning
      ...(isPackaged ? { devTools: false } : {}),
    },
  });

  // ── Content Security Policy (production only) ─
  // F-07: Restrict connect-src to specific port, not wildcard
  // F-07: Remove 'unsafe-eval' (only needed in dev for HMR)
  if (isPackaged) {
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        const csp = [
          "default-src 'self'",
          // Production: Next.js standalone still uses some inline scripts for hydration
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob:",
          // F-07: Restrict to app port only, not localhost:*
          `connect-src 'self' http://127.0.0.1:${INTERNAL_PORT}`,
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; ");
        const responseHeaders: Record<string, string> = {
          ...(details.responseHeaders as Record<string, string>),
        };
        responseHeaders["Content-Security-Policy"] = csp;
        callback({ responseHeaders });
      },
    );
  }

  Menu.setApplicationMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // R-07: Use new URL() for exact hostname + port matching
    try {
      const parsed = new URL(url);
      const allowedPorts = isDevMode ? ["3000"] : [String(INTERNAL_PORT)];
      if (
        parsed.hostname === "127.0.0.1" &&
        parsed.protocol === "http:" &&
        allowedPorts.includes(parsed.port)
      ) {
        return { action: "allow" };
      }
    } catch {
      // Invalid URL → deny
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  // F-07: Prevent navigation to external URLs (check both hostname AND port)
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      const allowedHosts = ["localhost", "127.0.0.1"];
      const allowedPorts = isDevMode
        ? [String(DEV_PORT)]
        : [String(INTERNAL_PORT)];
      const isAllowed =
        allowedHosts.includes(parsed.hostname) &&
        (parsed.port === "" || allowedPorts.includes(parsed.port)) &&
        parsed.protocol === "http:";
      if (!isAllowed) {
        event.preventDefault();
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          shell.openExternal(url);
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (isDevMode) {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
  });

  // ── Debug: log loading events ─────────────────
  mainWindow.webContents.on("did-start-loading", () => {
    console.log("[main] Page loading started");
  });
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[main] Page finished loading");
  });
  mainWindow.webContents.on(
    "did-fail-load",
    (_evt, errorCode, errorDescription, validatedURL) => {
      console.error(
        `[main] Page failed to load: ${errorCode} ${errorDescription} URL: ${validatedURL}`,
      );
      // Retry setelah 2 detik
      if (errorCode !== -3) {
        // -3 = aborted (user navigation), skip retry
        setTimeout(() => {
          console.log("[main] Retrying page load...");
          mainWindow?.loadURL(getLoadUrl());
        }, 2000);
      }
    },
  );
  mainWindow.webContents.on(
    "console-message",
    (_evt, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    },
  );

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
  // Path log file untuk ditampilkan ke user
  let logPath = "";
  try {
    logPath = path.join(app.getPath("userData"), "logs", "next-server.log");
  } catch {
    // ignore
  }

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const safeErrorMessage = escapeHtml(errorMessage);
  const safeLogPath = logPath ? escapeHtml(logPath) : "";

  mainWindow = new BrowserWindow({
    width: 700,
    height: 560,
    title: "POS & Agen Bisnis - Error",
    backgroundColor: "#fef2f2",
  });
  mainWindow.loadURL(
    "data:text/html," +
      encodeURIComponent(
        `<html><head><meta charset="utf-8"><style>
          body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; background: #fef2f2; color: #991b1b; }
          h1 { color: #dc2626; margin-bottom: 12px; font-size: 20px; }
          p { line-height: 1.6; margin-bottom: 10px; font-size: 13px; white-space: pre-wrap; word-break: break-word; }
          code { background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; }
          .footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #fecaca; font-size: 12px; color: #7f1d1d; }
          .log-info { background: #fff; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; margin-top: 12px; font-size: 11px; color: #7f1d1d; }
        </style></head><body>
          <h1>Gagal Memulai Aplikasi</h1>
          <p>${safeErrorMessage}</p>
          ${
            safeLogPath
              ? `<div class="log-info">
            <strong>Log file:</strong><br>
            <code>${safeLogPath}</code><br><br>
            Buka file di atas dengan Notepad untuk melihat detail error,
            lalu kirim ke developer untuk dianalisis.
          </div>`
              : ""
          }
          <div class="footer">
            <strong>Solusi yang bisa dicoba:</strong><br>
            • Tutup aplikasi lain yang mungkin pakai port 43219<br>
            • Disable antivirus sementara, lalu jalankan lagi<br>
            • Run as Administrator<br>
            • Reinstall aplikasi<br>
            • Hubungi developer dengan menyertakan log file di atas
          </div>
        </body></html>`,
      ),
  );
}

// ── IPC handlers ─────────────────────────────────
function registerAppIpc() {
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:isPackaged", () => app.isPackaged);
  ipcMain.handle("app:getPath", (_evt, name: string) => {
    try {
      if (!ALLOWED_APP_PATHS.has(name)) return null;
      return app.getPath(name as "userData" | "documents" | "desktop");
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
  ipcMain.handle(
    "window:isMaximized",
    () => mainWindow?.isMaximized() || false,
  );

  ipcMain.handle("update:check", async () => {
    try {
      return await checkForUpdatesNow();
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
  ipcMain.handle("update:simulate", async (_evt, version?: string) => {
    try {
      return await simulateUpdate(version);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
  ipcMain.handle("update:install", () => quitAndInstall());

  ipcMain.handle(
    "report:savePdf",
    async (_evt, payload: { html: string; defaultPath?: string }) => {
      let pdfWindow: BrowserWindow | null = null;
      try {
        const html = String(payload?.html || "");
        if (!html.trim()) return { ok: false, error: "Konten laporan kosong" };
        pdfWindow = new BrowserWindow({
          show: false,
          width: 900,
          height: 1200,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        });
        await pdfWindow.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
        );
        const pdf = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          pageSize: "A4",
          margins: { marginType: "default" },
        });
        const result = await (dialog.showSaveDialog as any)(
          mainWindow || undefined,
          {
            title: "Simpan Laporan PDF",
            defaultPath: payload?.defaultPath || "laporan.pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }],
          },
        );
        if (result.canceled || !result.filePath)
          return { ok: false, canceled: true };
        fs.writeFileSync(result.filePath, pdf);
        return { ok: true, filePath: result.filePath };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.close();
      }
    },
  );
}

// ── App lifecycle ────────────────────────────────
app.whenReady().then(async () => {
  registerAppIpc();
  registerPrinterIpc(() => mainWindow);
  registerWhatsAppIpc();
  await loadPrinterConfig();

  // ── Mode DEV: langsung load Next.js dev server ──
  if (isDevMode) {
    console.log(
      "[main] Mode DEV: connecting to Next.js dev server at http://localhost:" +
        DEV_PORT,
    );
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
          `atau jalankan 'npm run dev' di terminal terpisah dahulu.`,
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
    showErrorWindow(err instanceof Error ? err.message : String(err));
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
