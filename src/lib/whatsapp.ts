import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { db, dbReady } from "@/db";
import {
  accountMutations,
  accounts,
  settings,
  transactions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatRupiah, formatDate } from "@/lib/utils";

export type WhatsAppConnectionStatus =
  | "idle"
  | "initializing"
  | "qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "error";

interface WhatsAppState {
  status: WhatsAppConnectionStatus;
  qrDataUrl: string | null;
  lastError: string | null;
  client: any | null;
  initializing: boolean;
}

const state: WhatsAppState = {
  status: "idle",
  qrDataUrl: null,
  lastError: null,
  client: null,
  initializing: false,
};

let initPromise: Promise<Awaited<ReturnType<typeof getWhatsAppStatus>>> | null =
  null;
let qrTimeout: NodeJS.Timeout | null = null;

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

function getSessionDir(): string {
  // Never default to process.cwd() because Next standalone tracing may try to
  // copy browser profile files into .next/standalone and hit EBUSY on Windows.
  // Electron injects WHATSAPP_SESSION_DIR=userData/whatsapp-session. For web/dev
  // fallback, keep it outside the project directory in the OS home folder.
  const dir =
    process.env.WHATSAPP_SESSION_DIR ||
    path.join(os.homedir(), ".pos-brilink", "whatsapp-session");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {}
  return dir;
}

function getBrowserExecutablePath(): string | undefined {
  const browserPath = process.env.WHATSAPP_BROWSER_PATH;
  return browserPath && fs.existsSync(browserPath) ? browserPath : undefined;
}

function logWhatsApp(message: string, extra?: unknown) {
  if (extra !== undefined) console.log(`[whatsapp] ${message}`, extra);
  else console.log(`[whatsapp] ${message}`);
}

async function getRawClientState(): Promise<string | null> {
  if (!state.client) return null;
  try {
    return await state.client.getState().catch(() => null);
  } catch {
    return null;
  }
}

async function isClientSendReady(): Promise<boolean> {
  if (!state.client) return false;
  const clientState = await getRawClientState();
  if (clientState) logWhatsApp(`client state: ${clientState}`);
  if (clientState !== "CONNECTED") return false;

  try {
    const page = state.client.pupPage;
    if (!page) return false;
    return await page.evaluate(() => {
      const w = window as any;
      return Boolean(
        w.Store?.Chat &&
        w.Store?.Msg &&
        w.WWebJS?.getChat &&
        w.WWebJS?.sendMessage,
      );
    });
  } catch (error) {
    logWhatsApp(
      "send readiness check failed",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

async function refreshClientReadiness() {
  if (!state.client) return;
  try {
    const ready = await isClientSendReady();
    if (ready) {
      state.status = "ready";
      state.qrDataUrl = null;
      state.lastError = null;
      if (qrTimeout) clearTimeout(qrTimeout);
      return;
    }

    const clientState = await getRawClientState();
    if (
      clientState === "CONNECTED" &&
      !["qr", "error", "disconnected"].includes(state.status)
    ) {
      // Auth succeeded and WA is connected, but the WhatsApp Web injection layer
      // is not ready yet. Do not mark as ready because sendMessage would fail
      // with errors like: Cannot read properties of undefined (reading 'getChat').
      state.status = "authenticated";
    }
  } catch (error) {
    logWhatsApp(
      "failed to refresh readiness",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function normalizeWhatsAppNumber(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export async function getWhatsAppSettings() {
  await dbReady;
  const allSettings = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of allSettings) map[row.key] = row.value;
  return {
    enabled: map.whatsapp_enabled === "true",
    autoNotifyOwner: map.whatsapp_auto_notify_owner === "true",
    ownerNumber: map.whatsapp_owner_number || "",
  };
}

export async function getWhatsAppStatus() {
  await refreshClientReadiness();
  const cfg = await getWhatsAppSettings().catch(() => ({
    enabled: false,
    autoNotifyOwner: false,
    ownerNumber: "",
  }));
  return {
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    lastError: state.lastError,
    hasClient: Boolean(state.client),
    ...cfg,
  };
}

export async function initWhatsAppClient() {
  if (state.client || state.initializing) return getWhatsAppStatus();
  if (initPromise) return initPromise;
  initPromise = initWhatsAppClientLocked();
  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

async function initWhatsAppClientLocked() {
  if (state.client || state.initializing) return getWhatsAppStatus();

  state.initializing = true;
  state.status = "initializing";
  state.lastError = null;

  try {
    const [{ Client, LocalAuth }, qrcode] = await Promise.all([
      import("whatsapp-web.js") as Promise<any>,
      import("qrcode") as Promise<any>,
    ]);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: "pos-brilink-cashier",
        dataPath: getSessionDir(),
      }),
      puppeteer: {
        headless: true,
        executablePath: getBrowserExecutablePath(),
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      },
    });

    client.on("qr", async (qr: string) => {
      logWhatsApp("QR received");
      setQrWithTtl(await qrcode.toDataURL(qr, { margin: 1, width: 320 }));
    });
    client.on("authenticated", () => {
      logWhatsApp("authenticated");
      state.status = "authenticated";
      state.qrDataUrl = null;
      if (qrTimeout) clearTimeout(qrTimeout);
    });
    client.on("ready", () => {
      logWhatsApp("ready");
      state.status = "ready";
      state.qrDataUrl = null;
      if (qrTimeout) clearTimeout(qrTimeout);
      state.lastError = null;
    });
    client.on("disconnected", (reason: string) => {
      logWhatsApp("disconnected", reason);
      state.status = "disconnected";
      state.lastError = reason || null;
      state.client = null;
    });
    client.on("auth_failure", (msg: string) => {
      logWhatsApp("auth failure", msg);
      state.status = "error";
      state.lastError = msg || "Auth failure";
    });
    client.on("loading_screen", (percent: string, message: string) => {
      logWhatsApp(`loading ${percent}% ${message || ""}`.trim());
    });
    client.on("change_state", async (waState: string) => {
      logWhatsApp("change_state", waState);
      if (waState === "CONNECTED") {
        await refreshClientReadiness();
      }
    });

    state.client = client;
    await client.initialize();
    return getWhatsAppStatus();
  } catch (error) {
    state.status = "error";
    state.client = null;
    state.lastError = error instanceof Error ? error.message : String(error);
    return getWhatsAppStatus();
  } finally {
    state.initializing = false;
  }
}

export async function logoutWhatsAppClient() {
  try {
    if (state.client) {
      await state.client.logout().catch(() => {});
      await state.client.destroy().catch(() => {});
    }
  } finally {
    state.client = null;
    state.qrDataUrl = null;
    state.status = "disconnected";
  }
  return getWhatsAppStatus();
}

export async function restartWhatsAppClient() {
  try {
    if (state.client) {
      await state.client.destroy().catch(() => {});
    }
  } finally {
    state.client = null;
    state.qrDataUrl = null;
    state.lastError = null;
    state.status = "idle";
    state.initializing = false;
    if (qrTimeout) clearTimeout(qrTimeout);
  }
  return initWhatsAppClient();
}

async function waitForWhatsAppReady(timeoutMs = 20_000): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await refreshClientReadiness();
    if (state.client && state.status === "ready") return true;
    if (
      state.status === "qr" ||
      state.status === "error" ||
      state.status === "disconnected"
    )
      return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await refreshClientReadiness();
  return Boolean(state.client && state.status === "ready");
}

export async function sendWhatsAppMessage(to: string, message: string) {
  const number = normalizeWhatsAppNumber(to);
  if (!number) throw new Error("Nomor WhatsApp tujuan belum diatur");

  const ready = await waitForWhatsAppReady();
  if (!state.client || !ready)
    throw new Error(`WhatsApp belum siap mengirim (status: ${state.status})`);

  const chatId = `${number}@c.us`;
  try {
    await state.client.sendMessage(chatId, message);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Some packaged Electron runs report CONNECTED before WWebJS injection is ready.
    // Wait once more and retry to avoid transient getChat/sendMessage failures.
    if (
      msg.includes("getChat") ||
      msg.includes("sendMessage") ||
      msg.includes("WWebJS")
    ) {
      logWhatsApp("send failed before WA injection ready; retrying", msg);
      state.status = "authenticated";
      const retryReady = await waitForWhatsAppReady(15_000);
      if (state.client && retryReady) {
        await state.client.sendMessage(chatId, message);
        return;
      }
    }
    throw error;
  }
}

function ownerActionLabel(flowType: string | null | undefined) {
  switch (flowType) {
    case "cash_withdrawal":
      return "CEK TRANSFER MASUK - TARIK TUNAI";
    case "cash_deposit":
      return "MOHON TRANSFER - SETOR TUNAI";
    case "transfer":
      return "MOHON TRANSFER";
    case "payment":
      return "MOHON BAYAR PROVIDER";
    case "topup":
      return "MOHON PROSES TOP UP";
    default:
      return "NOTIFIKASI TRANSAKSI";
  }
}

function statusLabel(status: string | null | undefined): string {
  switch (status || "completed") {
    case "pending":
      return "Pending - perlu tindak lanjut";
    case "completed":
      return "Selesai";
    case "void":
      return "Dibatalkan";
    case "reversed":
      return "Di-reverse";
    default:
      return status || "Selesai";
  }
}

function signedRupiah(value: number): string {
  if (value > 0) return `+${formatRupiah(value)}`;
  if (value < 0) return `-${formatRupiah(Math.abs(value))}`;
  return formatRupiah(0);
}

export function shouldNotifyOwner(
  flowType: string | null | undefined,
): boolean {
  return [
    "cash_withdrawal",
    "cash_deposit",
    "transfer",
    "payment",
    "topup",
  ].includes(flowType || "");
}

export async function buildOwnerNotificationMessage(
  transactionId: number,
): Promise<string> {
  await dbReady;
  const [trx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);
  if (!trx) throw new Error("Transaksi tidak ditemukan");

  const [settlement] = trx.settlementAccountId
    ? await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, trx.settlementAccountId))
        .limit(1)
    : [null];

  const muts = await db
    .select()
    .from(accountMutations)
    .where(eq(accountMutations.referenceId, trx.id));
  const cashMut = muts.find(
    (m) => m.type.startsWith("brilink_out") || m.type.startsWith("brilink_in"),
  );
  const bankMut = muts.find((m) => m.accountId === trx.settlementAccountId);

  const nominal = Number(trx.totalAmount || 0);
  const admin = Number(trx.adminFee || 0);
  const profit = Number(trx.profit || 0);
  const cashReceived = Number(trx.cashReceived || 0);
  const cashDispensed = Number(trx.cashDispensed || 0);
  const bankImpact = Number(bankMut?.amount || 0);
  const cashImpact = Number(cashMut?.amount || 0);
  const serviceName = trx.subType || "Layanan Agen";
  const title = ownerActionLabel(trx.flowType);

  const lines: string[] = [
    `[${title}]`,
    "",
    `Kasir mencatat ${serviceName}.`,
    `Invoice: ${trx.invoiceNo}`,
    `Tanggal: ${formatDate(trx.createdAt as unknown as string)}`,
    `Status aplikasi: ${statusLabel(trx.status)}`,
  ];

  if (trx.customerName) lines.push(`Pelanggan: ${trx.customerName}`);
  if (trx.customerPhone) lines.push(`Tujuan/No HP/Rek: ${trx.customerPhone}`);
  if (settlement) lines.push(`Rekening terkait: ${settlement.name}`);

  lines.push("");
  lines.push("Rincian nominal:");

  switch (trx.flowType) {
    case "cash_withdrawal": {
      const transferIn = Math.abs(bankImpact || nominal + admin);
      lines.push(`Nominal tarik: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push(
        `Cash diserahkan kasir: ${formatRupiah(cashDispensed || nominal)}`,
      );
      lines.push(
        `Total yang harus masuk rekening: ${formatRupiah(transferIn)}`,
      );
      lines.push("");
      lines.push("Instruksi owner:");
      lines.push(
        `Mohon cek mutasi rekening apakah ${formatRupiah(transferIn)} sudah masuk.`,
      );
      lines.push(
        "Jika belum masuk, segera koordinasikan dengan kasir sebelum transaksi dianggap aman.",
      );
      break;
    }
    case "cash_deposit": {
      lines.push(`Nominal setor/transfer: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push(
        `Cash diterima kasir: ${formatRupiah(cashReceived || nominal + admin)}`,
      );
      lines.push("");
      lines.push("Instruksi owner:");
      lines.push(
        "Mohon lakukan transfer/setor ke rekening tujuan melalui kanal resmi.",
      );
      if (trx.customerPhone)
        lines.push(`Tujuan/Rekening: ${trx.customerPhone}`);
      lines.push("Isi nomor referensi setelah transaksi berhasil.");
      break;
    }
    case "transfer": {
      lines.push(`Nominal transfer: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push(
        `Cash diterima kasir: ${formatRupiah(cashReceived || nominal + admin)}`,
      );
      lines.push("");
      lines.push("Instruksi owner:");
      lines.push(
        "Mohon lakukan transfer dari rekening agen melalui kanal resmi.",
      );
      if (trx.customerPhone)
        lines.push(`Rekening/tujuan: ${trx.customerPhone}`);
      lines.push("Kirim atau isi nomor referensi setelah berhasil.");
      break;
    }
    case "payment": {
      lines.push(`Layanan: ${serviceName}`);
      lines.push(`Nominal tagihan: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      if (cashReceived > 0)
        lines.push(`Cash diterima kasir: ${formatRupiah(cashReceived)}`);
      lines.push("");
      lines.push("Instruksi owner:");
      lines.push("Mohon proses pembayaran di provider resmi.");
      if (trx.customerPhone)
        lines.push(`ID/No pelanggan: ${trx.customerPhone}`);
      lines.push("Isi nomor referensi/transaksi setelah berhasil.");
      break;
    }
    case "topup": {
      lines.push(`Layanan: ${serviceName}`);
      lines.push(`Nominal top up: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      if (cashReceived > 0)
        lines.push(`Cash diterima kasir: ${formatRupiah(cashReceived)}`);
      lines.push("");
      lines.push("Instruksi owner:");
      lines.push("Mohon proses top up melalui provider resmi.");
      if (trx.customerPhone) lines.push(`Tujuan: ${trx.customerPhone}`);
      lines.push("Isi nomor referensi jika tersedia.");
      break;
    }
    default: {
      lines.push(`Nominal: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push("");
      lines.push("Instruksi owner:");
      lines.push("Mohon cek/proses melalui kanal resmi.");
      break;
    }
  }

  lines.push("");
  lines.push("Dampak pencatatan:");
  if (cashMut) lines.push(`Kas Tunai: ${signedRupiah(cashImpact)}`);
  if (bankMut) lines.push(`Rekening: ${signedRupiah(bankImpact)}`);
  if (profit > 0) lines.push(`Profit Agen: +${formatRupiah(profit)}`);
  if (trx.referenceNo) lines.push(`Ref: ${trx.referenceNo}`);

  lines.push("");
  lines.push(
    "Catatan: aplikasi hanya mencatat transaksi. Eksekusi aktual tetap melalui kanal resmi.",
  );
  return lines.join("\n");
}

export async function notifyOwnerForTransaction(transactionId: number) {
  const cfg = await getWhatsAppSettings();
  if (!cfg.enabled || !cfg.autoNotifyOwner)
    return { sent: false, reason: "disabled" };
  if (!cfg.ownerNumber) return { sent: false, reason: "missing_owner_number" };

  const [trx] = await db
    .select({ flowType: transactions.flowType })
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);
  if (!trx || !shouldNotifyOwner(trx.flowType))
    return { sent: false, reason: "not_required" };

  // In Electron production, the Next.js child process starts with no in-memory
  // WhatsApp client even when a LocalAuth session already exists on disk.
  // Auto-initialize here so owner notifications work after app restart.
  if (!state.client || state.status !== "ready") {
    await initWhatsAppClient();
    const ready = await waitForWhatsAppReady();
    if (!ready) {
      return {
        sent: false,
        reason: "not_ready",
        status: state.status,
        error:
          state.lastError ||
          "WhatsApp belum terhubung. Buka Pengaturan → WhatsApp Owner lalu scan/refresh status.",
      };
    }
  }

  try {
    const message = await buildOwnerNotificationMessage(transactionId);
    await sendWhatsAppMessage(cfg.ownerNumber, message);
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: "send_failed",
      status: state.status,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
