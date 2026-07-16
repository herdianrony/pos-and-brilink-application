import { app, BrowserWindow, ipcMain } from "electron";
import crypto from "crypto";

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

function log(message: string, extra?: unknown) {
  if (extra !== undefined) console.log(`[whatsapp-electron] ${message}`, extra);
  else console.log(`[whatsapp-electron] ${message}`);
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
  if (state.window && !state.window.isDestroyed()) return state.window;

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    title: "WhatsApp Session",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: "persist:pos-brilink-whatsapp",
    },
  });

  win.on("closed", () => {
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

  try {
    const win = ensureWindow();
    const client = new Client({
      // Do not use LocalAuth here. In Electron mode, the BrowserWindow partition
      // is the persistent session store. LocalAuth sets a Puppeteer userDataDir
      // and can fail in packaged Electron with:
      // "The browser is already running for ...session-pos-brilink-cashier".
      electron: { window: win },
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
    });
    client.on("disconnected", (reason: string) => {
      log("disconnected", reason);
      state.status = "disconnected";
      state.lastError = reason || null;
      state.client = null;
    });
    client.on("auth_failure", (message: string) => {
      log("auth failure", message);
      state.status = "error";
      state.lastError = message || "Auth failure";
    });
    client.on("change_state", (waState: string) => {
      log("change_state", waState);
    });

    state.client = client;
    await client.initialize();
    return getWhatsAppStatus();
  } catch (error) {
    state.status = "error";
    state.client = null;
    state.lastError = error instanceof Error ? error.message : String(error);
    log("init error", state.lastError);
    return getWhatsAppStatus();
  } finally {
    state.initializing = false;
  }
}

export async function restartWhatsAppClient() {
  const now = Date.now();
  if (now - lastRestartAt < restartCooldownMs) {
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
    return { ok: true };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    state.lastError = messageText;
    log("send error", messageText);
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
