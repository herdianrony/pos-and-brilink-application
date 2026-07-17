import { app, BrowserWindow, ipcMain } from "electron";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// IMPORTANT: require wwebjs-electron from Electron main process before app.whenReady().
// It appends the remote debugging switch needed to attach to Electron Chromium.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require("wwebjs-electron");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qrcode = require("qrcode");

type WhatsAppStatus =
  | "idle"
  | "initializing"
  | "qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "error";

interface State {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  lastError: string | null;
  client: any | null;
  window: BrowserWindow | null;
  initializing: boolean;
}

const state: State = {
  status: "idle",
  qrDataUrl: null,
  lastError: null,
  client: null,
  window: null,
  initializing: false,
};

let initPromise: Promise<Awaited<ReturnType<typeof getWhatsAppStatus>>> | null =
  null;
let qrTimeout: NodeJS.Timeout | null = null;
let lastRestartAt = 0;
const restartCooldownMs = 10_000;
const sendTimestamps: number[] = [];
const maxSendsPerMinute = 10;
const maxMessageLength = 4096;
const maxLogBytes = 2 * 1024 * 1024;

function normalizeWhatsAppNumber(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function timingSafeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return (
    aBuffer.length === bBuffer.length &&
    crypto.timingSafeEqual(aBuffer, bBuffer)
  );
}

function signSendPayload(to: string, message: string, expiresAt: number) {
  const secret = process.env.AUTH_SECRET || "";
  if (secret.length < 32) return "";
  return crypto
    .createHmac("sha256", secret)
    .update(`${to}\n${expiresAt}\n${message}`)
    .digest("hex");
}

function verifySendToken(payload: {
  to: string;
  message: string;
  token?: string;
  expiresAt?: number;
}) {
  if (!payload.token || !payload.expiresAt) return false;
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt < Date.now())
    return false;
  const expected = signSendPayload(
    normalizeWhatsAppNumber(payload.to),
    payload.message,
    payload.expiresAt,
  );
  return Boolean(expected) && timingSafeEqualString(expected, payload.token);
}

function checkSendRateLimit() {
  const now = Date.now();
  while (sendTimestamps.length && sendTimestamps[0] <= now - 60_000)
    sendTimestamps.shift();
  if (sendTimestamps.length >= maxSendsPerMinute) return false;
  sendTimestamps.push(now);
  return true;
}

function getWhatsAppLogPath() {
  try {
    const dir = app.isReady()
      ? path.join(app.getPath("userData"), "logs")
      : path.join(process.cwd(), ".data", "logs");
    return path.join(dir, "whatsapp-electron.log");
  } catch {
    return path.join(process.cwd(), ".data", "logs", "whatsapp-electron.log");
  }
}

function sanitizeLogExtra(extra: unknown, depth = 0): unknown {
  if (extra == null) return extra;
  if (extra instanceof Error) {
    return {
      name: extra.name,
      message: extra.message,
      stack: extra.stack?.split("\n").slice(0, 12).join("\n"),
    };
  }
  if (typeof extra === "string") return extra.slice(0, 3000);
  if (typeof extra !== "object") return extra;
  if (depth >= 3) return "[truncated]";
  if (Array.isArray(extra))
    return extra.slice(0, 30).map((item) => sanitizeLogExtra(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    extra as Record<string, unknown>,
  ).slice(0, 50)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("pin")
    ) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = sanitizeLogExtra(value, depth + 1);
  }
  return out;
}

function appendWhatsAppLog(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  extra?: unknown,
) {
  try {
    const logPath = getWhatsAppLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true, mode: 0o700 });
    try {
      const stat = fs.statSync(logPath);
      if (stat.size > maxLogBytes) {
        fs.rmSync(`${logPath}.1`, { force: true });
        fs.renameSync(logPath, `${logPath}.1`);
      }
    } catch {
      // file does not exist yet
    }

    const entry = {
      ts: new Date().toISOString(),
      level,
      source: "whatsapp-electron",
      message: String(message || "").slice(0, 1000),
      ...(extra !== undefined ? { details: sanitizeLogExtra(extra) } : {}),
    };
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch (error) {
    console.warn("[whatsapp-electron] failed to write log", error);
  }
}

function log(
  message: string,
  extra?: unknown,
  level: "debug" | "info" | "warn" | "error" = "info",
) {
  if (extra !== undefined) console.log(`[whatsapp-electron] ${message}`, extra);
  else console.log(`[whatsapp-electron] ${message}`);
  appendWhatsAppLog(level, message, extra);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`${label} timeout setelah ${timeoutMs / 1000} detik`),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function setQrWithTtl(qrDataUrl: string) {
  state.qrDataUrl = qrDataUrl;
  state.status = "qr";
  if (qrTimeout) clearTimeout(qrTimeout);
  qrTimeout = setTimeout(() => {
    if (state.status === "qr") {
      state.qrDataUrl = null;
      state.status = "idle";
    }
  }, 60_000);
}

function ensureWindow() {
  if (state.window && !state.window.isDestroyed()) {
    if (!state.window.isVisible()) state.window.show();
    return state.window;
  }

  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    show: true,
    title: "WhatsApp Session - BRILink POS",
    backgroundColor: "#0f172a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false,
      partition: "persist:pos-brilink-whatsapp",
    },
  });

  log("window created", { partition: "persist:pos-brilink-whatsapp" });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("dom-ready", () =>
    log("window dom-ready", { url: win.webContents.getURL() }),
  );
  win.webContents.on("did-start-loading", () =>
    log("window did-start-loading", { url: win.webContents.getURL() }, "debug"),
  );
  win.webContents.on("did-finish-load", () =>
    log("window did-finish-load", { url: win.webContents.getURL() }),
  );
  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      log(
        "window did-fail-load",
        { errorCode, errorDescription, validatedURL },
        "error",
      );
    },
  );
  win.webContents.on("render-process-gone", (_event, details) => {
    log("window render-process-gone", details, "error");
  });
  win.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      if (/error|warn|qr|auth|whatsapp/i.test(message)) {
        log(
          "window console",
          { level, message, line, sourceId },
          level >= 2 ? "warn" : "debug",
        );
      }
    },
  );

  win.on("closed", () => {
    log("window closed");
    if (state.window === win) state.window = null;
  });

  state.window = win;
  return win;
}

export async function getWhatsAppStatus() {
  return {
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    lastError: state.lastError,
    hasClient: Boolean(state.client),
  };
}

export async function startWhatsAppClient() {
  if (state.client || state.initializing) return getWhatsAppStatus();
  if (initPromise) return initPromise;
  initPromise = startWhatsAppClientLocked();
  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

async function startWhatsAppClientLocked() {
  if (state.client || state.initializing) return getWhatsAppStatus();
  state.initializing = true;
  state.status = "initializing";
  state.lastError = null;
  log("start requested");

  try {
    const win = ensureWindow();
    const client = new Client({
      // Do not use LocalAuth here. In Electron mode, the BrowserWindow partition
      // is the persistent session store. LocalAuth sets a Puppeteer userDataDir
      // and can fail in packaged Electron with:
      // "The browser is already running for ...session-pos-brilink-cashier".
      electron: { window: win },
      authTimeoutMs: 60_000,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      // Use Electron's native Chromium user-agent. WhatsApp Web can be sensitive
      // to spoofed/stale user agents; the visible session window + log file will
      // show clearly if WhatsApp reports an unsupported browser.
      userAgent: false,
      webVersionCache: { type: "none" },
    });

    client.on("qr", async (qr: string) => {
      log("QR received");
      setQrWithTtl(await qrcode.toDataURL(qr, { margin: 1, width: 320 }));
    });
    client.on("authenticated", () => {
      log("authenticated");
      state.status = "authenticated";
      state.qrDataUrl = null;
      if (qrTimeout) clearTimeout(qrTimeout);
    });
    client.on("ready", () => {
      log("ready");
      state.status = "ready";
      state.qrDataUrl = null;
      state.lastError = null;
      if (qrTimeout) clearTimeout(qrTimeout);
      if (state.window && !state.window.isDestroyed()) state.window.hide();
    });
    client.on("disconnected", (reason: string) => {
      log("disconnected", reason, "warn");
      state.status = "disconnected";
      state.lastError = reason || null;
      state.client = null;
    });
    client.on("auth_failure", (message: string) => {
      log("auth failure", message, "error");
      state.status = "error";
      state.lastError = message || "Auth failure";
    });
    client.on("change_state", (waState: string) => {
      log("change_state", waState);
    });

    state.client = client;
    log("client.initialize called");
    await withTimeout(client.initialize(), 90_000, "WhatsApp initialize");
    log("client.initialize returned", await getWhatsAppStatus());
    return getWhatsAppStatus();
  } catch (error) {
    state.status = "error";
    state.client = null;
    state.lastError = error instanceof Error ? error.message : String(error);
    log("init error", state.lastError, "error");
    return getWhatsAppStatus();
  } finally {
    state.initializing = false;
  }
}

export async function restartWhatsAppClient() {
  log("restart requested");
  const now = Date.now();
  if (now - lastRestartAt < restartCooldownMs) {
    log(
      "restart rejected by cooldown",
      { lastRestartAt, restartCooldownMs },
      "warn",
    );
    return {
      ...(await getWhatsAppStatus()),
      error:
        "Restart WhatsApp terlalu sering. Tunggu beberapa detik lalu coba lagi.",
    };
  }
  lastRestartAt = now;
  try {
    if (state.client) {
      await state.client.destroy().catch(() => {});
    }
    if (state.window && !state.window.isDestroyed()) {
      state.window.close();
    }
  } finally {
    state.client = null;
    state.window = null;
    state.qrDataUrl = null;
    state.lastError = null;
    state.status = "idle";
    state.initializing = false;
    if (qrTimeout) clearTimeout(qrTimeout);
  }
  return startWhatsAppClient();
}

export async function logoutWhatsAppClient() {
  log("logout requested");
  try {
    if (state.client) {
      await state.client.logout().catch(() => {});
      await state.client.destroy().catch(() => {});
    }
    if (state.window && !state.window.isDestroyed()) {
      await state.window.webContents.session.clearStorageData().catch(() => {});
      await state.window.webContents.session.clearCache().catch(() => {});
      state.window.close();
    }
  } finally {
    state.client = null;
    state.window = null;
    state.qrDataUrl = null;
    state.lastError = null;
    state.status = "disconnected";
  }
  return getWhatsAppStatus();
}

export async function sendWhatsAppMessage(to: string, message: string) {
  log("send requested", {
    to: normalizeWhatsAppNumber(to),
    messageLength: String(message || "").length,
  });
  if (!message || message.length > maxMessageLength) {
    return {
      ok: false,
      error: `Pesan WhatsApp wajib diisi dan maksimal ${maxMessageLength} karakter`,
    };
  }
  if (!checkSendRateLimit()) {
    return {
      ok: false,
      error:
        "Batas kirim WhatsApp tercapai (maks 10 pesan/menit). Tunggu sebentar.",
    };
  }

  if (!state.client || state.status !== "ready") {
    const status = await startWhatsAppClient();
    if (status.status !== "ready") {
      return {
        ok: false,
        error: `WhatsApp belum siap (status: ${status.status})`,
        status,
      };
    }
  }

  try {
    const number = normalizeWhatsAppNumber(to);
    if (!number)
      return { ok: false, error: "Nomor WhatsApp tujuan tidak valid" };
    const chatId = `${number}@c.us`;
    await state.client.sendMessage(chatId, message);
    log("send success", { to: number });
    return { ok: true };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    state.lastError = messageText;
    log("send error", messageText, "error");
    return { ok: false, error: messageText, status: await getWhatsAppStatus() };
  }
}

export function registerWhatsAppIpc() {
  ipcMain.handle("whatsapp:status", () => getWhatsAppStatus());
  ipcMain.handle("whatsapp:start", () => startWhatsAppClient());
  ipcMain.handle("whatsapp:restart", () => restartWhatsAppClient());
  ipcMain.handle("whatsapp:logout", () => logoutWhatsAppClient());
  ipcMain.handle(
    "whatsapp:send",
    (
      _evt,
      payload: {
        to: string;
        message: string;
        token?: string;
        expiresAt?: number;
      },
    ) => {
      const normalizedTo = normalizeWhatsAppNumber(payload?.to || "");
      const message = String(payload?.message || "");
      if (
        !verifySendToken({
          to: normalizedTo,
          message,
          token: payload?.token,
          expiresAt: payload?.expiresAt,
        })
      ) {
        return {
          ok: false,
          error: "Token pengiriman WhatsApp tidak valid atau sudah kedaluwarsa",
        };
      }
      return sendWhatsAppMessage(normalizedTo, message);
    },
  );
}
