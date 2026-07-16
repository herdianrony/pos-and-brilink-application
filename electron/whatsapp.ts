import { app, BrowserWindow, ipcMain } from "electron";

// IMPORTANT: require wwebjs-electron from Electron main process before app.whenReady().
// It appends the remote debugging switch needed to attach to Electron Chromium.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require("wwebjs-electron");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qrcode = require("qrcode");

type WhatsAppStatus = "idle" | "initializing" | "qr" | "authenticated" | "ready" | "disconnected" | "error";

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

let initPromise: Promise<Awaited<ReturnType<typeof getWhatsAppStatus>>> | null = null;
let qrTimeout: NodeJS.Timeout | null = null;

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
    state.status = "disconnected";
  }
  return getWhatsAppStatus();
}

export async function sendWhatsAppMessage(to: string, message: string) {
  if (!state.client || state.status !== "ready") {
    const status = await startWhatsAppClient();
    if (status.status !== "ready") {
      return { ok: false, error: `WhatsApp belum siap (status: ${status.status})`, status };
    }
  }

  try {
    const number = String(to || "").replace(/\D/g, "");
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
  ipcMain.handle("whatsapp:send", (_evt, payload: { to: string; message: string }) =>
    sendWhatsAppMessage(payload.to, payload.message)
  );
}
