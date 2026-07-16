import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { db, dbReady } from "@/db";
import { accountMutations, accounts, settings, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatRupiah, formatDate } from "@/lib/utils";

export type WhatsAppConnectionStatus = "idle" | "initializing" | "qr" | "authenticated" | "ready" | "disconnected" | "error";

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

function getSessionDir(): string {
  // Never default to process.cwd() because Next standalone tracing may try to
  // copy browser profile files into .next/standalone and hit EBUSY on Windows.
  // Electron injects WHATSAPP_SESSION_DIR=userData/whatsapp-session. For web/dev
  // fallback, keep it outside the project directory in the OS home folder.
  const dir = process.env.WHATSAPP_SESSION_DIR || path.join(os.homedir(), ".pos-brilink", "whatsapp-session");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getBrowserExecutablePath(): string | undefined {
  const browserPath = process.env.WHATSAPP_BROWSER_PATH;
  return browserPath && fs.existsSync(browserPath) ? browserPath : undefined;
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
  const rows = await db.select().from(settings).where(eq(settings.key, "whatsapp_enabled"));
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
  const cfg = await getWhatsAppSettings().catch(() => ({ enabled: false, autoNotifyOwner: false, ownerNumber: "" }));
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
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      },
    });

    client.on("qr", async (qr: string) => {
      state.qrDataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 320 });
      state.status = "qr";
    });
    client.on("authenticated", () => {
      state.status = "authenticated";
      state.qrDataUrl = null;
    });
    client.on("ready", () => {
      state.status = "ready";
      state.qrDataUrl = null;
      state.lastError = null;
    });
    client.on("disconnected", (reason: string) => {
      state.status = "disconnected";
      state.lastError = reason || null;
      state.client = null;
    });
    client.on("auth_failure", (msg: string) => {
      state.status = "error";
      state.lastError = msg || "Auth failure";
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

export async function sendWhatsAppMessage(to: string, message: string) {
  const number = normalizeWhatsAppNumber(to);
  if (!number) throw new Error("Nomor WhatsApp tujuan belum diatur");
  if (!state.client || state.status !== "ready") throw new Error("WhatsApp belum terhubung");
  const chatId = `${number}@c.us`;
  await state.client.sendMessage(chatId, message);
}

function ownerActionLabel(flowType: string | null | undefined) {
  switch (flowType) {
    case "cash_withdrawal": return "CEK TRANSFER MASUK";
    case "cash_deposit": return "MOHON TRANSFER/SETOR";
    case "transfer": return "MOHON TRANSFER";
    case "payment": return "MOHON BAYAR PROVIDER";
    case "topup": return "MOHON TOP UP PROVIDER";
    default: return "NOTIFIKASI TRANSAKSI";
  }
}

export function shouldNotifyOwner(flowType: string | null | undefined): boolean {
  return ["cash_withdrawal", "cash_deposit", "transfer", "payment", "topup"].includes(flowType || "");
}

export async function buildOwnerNotificationMessage(transactionId: number): Promise<string> {
  await dbReady;
  const [trx] = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  if (!trx) throw new Error("Transaksi tidak ditemukan");

  const [settlement] = trx.settlementAccountId
    ? await db.select().from(accounts).where(eq(accounts.id, trx.settlementAccountId)).limit(1)
    : [null];

  const muts = await db.select().from(accountMutations).where(eq(accountMutations.referenceId, trx.id));
  const cashMut = muts.find((m) => m.type.startsWith("brilink_out") || m.type.startsWith("brilink_in"));
  const bankMut = muts.find((m) => m.accountId === trx.settlementAccountId);

  const nominal = Number(trx.totalAmount || 0);
  const admin = Number(trx.adminFee || 0);
  const profit = Number(trx.profit || 0);
  const title = ownerActionLabel(trx.flowType);

  const lines = [
    `[${title}]`,
    "",
    `Kasir mencatat transaksi ${trx.subType || trx.type}.`,
    `Invoice: ${trx.invoiceNo}`,
    `Tanggal: ${formatDate(trx.createdAt as unknown as string)}`,
    `Nominal: ${formatRupiah(nominal)}`,
  ];

  if (admin > 0) lines.push(`Admin/Fee: ${formatRupiah(admin)}`);
  if (profit > 0) lines.push(`Profit Agen: ${formatRupiah(profit)}`);

  if (trx.flowType === "cash_withdrawal") {
    lines.push(`Cash diserahkan kasir: ${formatRupiah(Number(trx.cashDispensed || 0))}`);
    lines.push(`Transfer masuk yang perlu dicek: ${formatRupiah(Math.abs(Number(bankMut?.amount || nominal + admin)))}`);
  } else if (trx.cashReceived && Number(trx.cashReceived) > 0) {
    lines.push(`Cash diterima kasir: ${formatRupiah(Number(trx.cashReceived))}`);
  }

  if (settlement) lines.push(`Rekening settlement: ${settlement.name}`);
  if (bankMut) lines.push(`Dampak rekening: ${Number(bankMut.amount) >= 0 ? "+" : "-"}${formatRupiah(Math.abs(Number(bankMut.amount)))}`);
  if (cashMut) lines.push(`Dampak kas: ${Number(cashMut.amount) >= 0 ? "+" : "-"}${formatRupiah(Math.abs(Number(cashMut.amount)))}`);
  if (trx.customerName) lines.push(`Pelanggan: ${trx.customerName}`);
  if (trx.customerPhone) lines.push(`Tujuan/No HP/Rek: ${trx.customerPhone}`);
  if (trx.referenceNo) lines.push(`Ref: ${trx.referenceNo}`);

  lines.push("");
  lines.push("Mohon cek/proses melalui kanal resmi. Aplikasi hanya mencatat transaksi.");
  return lines.join("\n");
}

export async function notifyOwnerForTransaction(transactionId: number) {
  const cfg = await getWhatsAppSettings();
  if (!cfg.enabled || !cfg.autoNotifyOwner) return { sent: false, reason: "disabled" };
  if (!cfg.ownerNumber) return { sent: false, reason: "missing_owner_number" };

  const [trx] = await db.select({ flowType: transactions.flowType }).from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  if (!trx || !shouldNotifyOwner(trx.flowType)) return { sent: false, reason: "not_required" };

  const message = await buildOwnerNotificationMessage(transactionId);
  await sendWhatsAppMessage(cfg.ownerNumber, message);
  return { sent: true };
}
