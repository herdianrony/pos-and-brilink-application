/**
 * wa-service — Baileys WhatsApp sidecar for Tauri
 * 
 * Protocol: JSONL over stdin/stdout
 *   IN  → { type: "status" | "start" | "restart" | "logout" | "send" | "notify", ... }
 *   OUT ← { type: "status" | "qr" | "ready" | "disconnected" | "error" | "result", ... }
 */
import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

// ─── Session directory ───────────────────────────────────────────────
const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR ||
  path.join(os.homedir(), '.pos-brilink', 'whatsapp-session');

// ─── State ───────────────────────────────────────────────────────────
let sock = null;
let connectionStatus = 'idle'; // idle | initializing | qr | connecting | authenticated | ready | disconnected | error
let qrDataUrl = null;
let lastError = null;
let qrTimeout = null;
let shouldReconnect = true;

// ─── Helpers ─────────────────────────────────────────────────────────
function send(msg) {
  const line = JSON.stringify(msg);
  process.stdout.write(line + '\n');
}

function log(level, message, data) {
  send({ type: 'log', level, message, data: data ?? undefined, ts: Date.now() });
}

function setStatus(s, err) {
  connectionStatus = s;
  if (err !== undefined) lastError = err ?? null;
  send({ type: 'status', status: connectionStatus, lastError: lastError, ts: Date.now() });
}

function setQrWithTtl(dataUrl) {
  qrDataUrl = dataUrl;
  setStatus('qr');
  if (qrTimeout) clearTimeout(qrTimeout);
  qrTimeout = setTimeout(() => {
    if (connectionStatus === 'qr') {
      qrDataUrl = null;
      setStatus('idle');
    }
  }, 60_000);
}

function clearQr() {
  qrDataUrl = null;
  if (qrTimeout) {
    clearTimeout(qrTimeout);
    qrTimeout = null;
  }
}

// ─── WhatsApp normalization ──────────────────────────────────────────
function normalizeWhatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

// ─── Core: connect to WhatsApp ───────────────────────────────────────
async function startConnection() {
  if (sock || connectionStatus === 'initializing' || connectionStatus === 'connecting') {
    send({ type: 'result', id: null, ok: true, status: connectionStatus });
    return;
  }

  setStatus('initializing');
  clearQr();
  lastError = null;

  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
  } catch {}

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      logger: {
        level: 'silent',
        info: () => {},
        debug: () => {},
        warn: (msg) => log('warn', msg),
        error: (msg) => log('error', msg),
        trace: () => {},
        fatal: (msg) => log('error', `FATAL: ${msg}`),
        child: () => ({ level: 'silent', info: () => {}, debug: () => {}, warn: () => {}, error: () => {}, trace: () => {}, fatal: () => {}, child: () => {} }),
      },
      shouldSyncHistoryMessage: () => false,
      getMessage: () => Promise.resolve({}),
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        log('info', 'QR received');
        try {
          const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
          setQrWithTtl(dataUrl);
          send({ type: 'qr', qrDataUrl: dataUrl, ts: Date.now() });
        } catch (e) {
          log('error', 'QR encode failed', e.message);
        }
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const msg = lastDisconnect?.error?.message || 'Connection closed';
        log('warn', `connection closed: ${code} — ${msg}`);

        if (code === DisconnectReason.loggedOut) {
          setStatus('disconnected', 'Session di-logout dari perangkat lain');
          sock = null;
        } else if (shouldReconnect) {
          setStatus('connecting', msg);
          log('info', 'reconnecting in 3s...');
          setTimeout(() => startConnection(), 3000);
        } else {
          setStatus('disconnected', msg);
          sock = null;
        }
      }

      if (connection === 'open') {
        clearQr();
        setStatus('ready');
        log('info', 'WhatsApp connected & ready');
        send({ type: 'ready', ts: Date.now() });
      }
    });

    sock.ev.on('creds.update', saveCreds);

    setStatus('connecting');
  } catch (err) {
    log('error', 'init failed', err.message);
    setStatus('error', err.message);
    sock = null;
  }
}

// ─── Actions ─────────────────────────────────────────────────────────
async function doSend(to, message) {
  const number = normalizeWhatsAppNumber(to);
  if (!number) throw new Error('Nomor WhatsApp tujuan belum diatur');
  if (!sock || connectionStatus !== 'ready') {
    throw new Error(`WhatsApp belum siap (status: ${connectionStatus})`);
  }
  const jid = `${number}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
}

async function doLogout() {
  if (sock) {
    try { await sock.logout(); } catch {}
    try { sock.end(); } catch {}
  }
  sock = null;
  clearQr();
  setStatus('disconnected');
  // Clean session files
  try {
    const files = fs.readdirSync(SESSION_DIR);
    for (const f of files) {
      const fp = path.join(SESSION_DIR, f);
      if (f !== 'app_state.json' || true) { // clean all
        fs.rmSync(fp, { recursive: true, force: true });
      }
    }
  } catch {}
}

async function doRestart() {
  if (sock) {
    try { sock.end(); } catch {}
    sock = null;
  }
  clearQr();
  lastError = null;
  connectionStatus = 'idle';
  await startConnection();
}

// ─── Message builder (port from Electron whatsapp.ts) ────────────────
function ownerActionLabel(flowType) {
  switch (flowType) {
    case 'cash_withdrawal': return 'CEK TRANSFER MASUK - TARIK TUNAI';
    case 'cash_deposit': return 'MOHON TRANSFER - SETOR TUNAI';
    case 'transfer': return 'MOHON TRANSFER';
    case 'payment': return 'MOHON BAYAR PROVIDER';
    case 'topup': return 'MOHON PROSES TOP UP';
    default: return 'NOTIFIKASI TRANSAKSI';
  }
}

function statusLabel(status) {
  switch (status || 'completed') {
    case 'pending': return 'Pending - perlu tindak lanjut';
    case 'completed': return 'Selesai';
    case 'void': return 'Dibatalkan';
    case 'reversed': return 'Di-reverse';
    default: return status || 'Selesai';
  }
}

function formatRupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

function signedRupiah(v) {
  if (v > 0) return `+${formatRupiah(v)}`;
  if (v < 0) return `-${formatRupiah(Math.abs(v))}`;
  return formatRupiah(0);
}

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildNotificationMessage(trx) {
  const nominal = Number(trx.total_amount || 0);
  const admin = Number(trx.admin_fee || 0);
  const profit = Number(trx.profit || 0);
  const cashReceived = Number(trx.cash_received || 0);
  const cashDispensed = Number(trx.cash_dispensed || 0);
  const cashImpact = Number(trx.cash_mutation_amount || 0);
  const bankImpact = Number(trx.bank_mutation_amount || 0);
  const serviceName = trx.sub_type || 'Layanan Agen';
  const title = ownerActionLabel(trx.flow_type);

  const lines = [
    `[${title}]`,
    '',
    `Kasir mencatat ${serviceName}.`,
    `Invoice: ${trx.invoice_no}`,
    `Tanggal: ${formatDate(trx.created_at)}`,
    `Status aplikasi: ${statusLabel(trx.status)}`,
  ];
  if (trx.customer_name) lines.push(`Pelanggan: ${trx.customer_name}`);
  if (trx.customer_phone) lines.push(`Tujuan/No HP/Rek: ${trx.customer_phone}`);
  if (trx.settlement_account_name) lines.push(`Rekening terkait: ${trx.settlement_account_name}`);

  lines.push('', 'Rincian nominal:');

  switch (trx.flow_type) {
    case 'cash_withdrawal': {
      const transferIn = Math.abs(bankImpact || nominal + admin);
      lines.push(`Nominal tarik: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push(`Cash diserahkan kasir: ${formatRupiah(cashDispensed || nominal)}`);
      lines.push(`Total yang harus masuk rekening: ${formatRupiah(transferIn)}`);
      lines.push('', 'Instruksi owner:');
      lines.push(`Mohon cek mutasi rekening apakah ${formatRupiah(transferIn)} sudah masuk.`);
      lines.push('Jika belum masuk, segera koordinasikan dengan kasir sebelum transaksi dianggap aman.');
      break;
    }
    case 'cash_deposit': {
      lines.push(`Nominal setor/transfer: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push(`Cash diterima kasir: ${formatRupiah(cashReceived || nominal + admin)}`);
      lines.push('', 'Instruksi owner:');
      lines.push('Mohon lakukan transfer/setor ke rekening tujuan melalui kanal resmi.');
      if (trx.customer_phone) lines.push(`Tujuan/Rekening: ${trx.customer_phone}`);
      lines.push('Isi nomor referensi setelah transaksi berhasil.');
      break;
    }
    case 'transfer': {
      lines.push(`Nominal transfer: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push(`Cash diterima kasir: ${formatRupiah(cashReceived || nominal + admin)}`);
      lines.push('', 'Instruksi owner:');
      lines.push('Mohon lakukan transfer dari rekening agen melalui kanal resmi.');
      if (trx.customer_phone) lines.push(`Rekening/tujuan: ${trx.customer_phone}`);
      lines.push('Kirim atau isi nomor referensi setelah berhasil.');
      break;
    }
    case 'payment': {
      lines.push(`Layanan: ${serviceName}`);
      lines.push(`Nominal tagihan: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      if (cashReceived > 0) lines.push(`Cash diterima kasir: ${formatRupiah(cashReceived)}`);
      lines.push('', 'Instruksi owner:');
      lines.push('Mohon proses pembayaran di provider resmi.');
      if (trx.customer_phone) lines.push(`ID/No pelanggan: ${trx.customer_phone}`);
      lines.push('Isi nomor referensi/transaksi setelah berhasil.');
      break;
    }
    case 'topup': {
      lines.push(`Layanan: ${serviceName}`);
      lines.push(`Nominal top up: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      if (cashReceived > 0) lines.push(`Cash diterima kasir: ${formatRupiah(cashReceived)}`);
      lines.push('', 'Instruksi owner:');
      lines.push('Mohon proses top up melalui provider resmi.');
      if (trx.customer_phone) lines.push(`Tujuan: ${trx.customer_phone}`);
      lines.push('Isi nomor referensi jika tersedia.');
      break;
    }
    default: {
      lines.push(`Nominal: ${formatRupiah(nominal)}`);
      if (admin > 0) lines.push(`Admin: ${formatRupiah(admin)}`);
      lines.push('', 'Instruksi owner:');
      lines.push('Mohon cek/proses melalui kanal resmi.');
      break;
    }
  }

  lines.push('', 'Dampak pencatatan:');
  if (trx.cash_mutation_amount) lines.push(`Kas Tunai: ${signedRupiah(cashImpact)}`);
  if (trx.bank_mutation_amount) lines.push(`Rekening: ${signedRupiah(bankImpact)}`);
  if (profit > 0) lines.push(`Profit Agen: +${formatRupiah(profit)}`);
  if (trx.reference_no) lines.push(`Ref: ${trx.reference_no}`);

  lines.push('', 'Catatan: aplikasi hanya mencatat transaksi. Eksekusi aktual tetap melalui kanal resmi.');
  return lines.join('\n');
}

function shouldNotify(flowType) {
  return ['cash_withdrawal', 'cash_deposit', 'transfer', 'payment', 'topup'].includes(flowType || '');
}

// ─── Handle incoming messages from Tauri ────────────────────────────
async function handleMessage(msg) {
  const { type, id } = msg;
  const reply = (ok, data) => send({ type: 'result', id, ok, ...data, ts: Date.now() });
  const fail = (error) => send({ type: 'result', id, ok: false, error, ts: Date.now() });

  try {
    switch (type) {
      case 'ping':
        reply(true, { status: connectionStatus });
        break;

      case 'status':
        reply(true, {
          status: connectionStatus,
          qrDataUrl,
          lastError,
          hasClient: Boolean(sock),
        });
        break;

      case 'start':
        await startConnection();
        reply(true, { status: connectionStatus, qrDataUrl, lastError });
        break;

      case 'restart':
        await doRestart();
        reply(true, { status: connectionStatus, qrDataUrl, lastError });
        break;

      case 'logout':
        await doLogout();
        reply(true, { status: connectionStatus });
        break;

      case 'send': {
        const { to, message } = msg;
        await doSend(to, message);
        reply(true, { sent: true });
        break;
      }

      case 'notify': {
        const { transaction, settings } = msg;
        const enabled = settings?.whatsapp_enabled === 'true' || settings?.whatsapp_enabled === true;
        const autoNotify = settings?.whatsapp_auto_notify_owner === 'true' || settings?.whatsapp_auto_notify_owner === true;
        const ownerNumber = settings?.whatsapp_owner_number || '';

        if (!enabled || !autoNotify) {
          reply(true, { sent: false, reason: 'disabled' });
          break;
        }
        if (!ownerNumber) {
          reply(true, { sent: false, reason: 'missing_owner_number' });
          break;
        }
        if (!transaction || !shouldNotify(transaction.flow_type)) {
          reply(true, { sent: false, reason: 'not_required' });
          break;
        }
        if (!sock || connectionStatus !== 'ready') {
          // Auto-start if not running
          await startConnection();
          // Wait up to 20s for ready
          for (let i = 0; i < 40; i++) {
            if (connectionStatus === 'ready') break;
            if (['error', 'disconnected', 'qr'].includes(connectionStatus)) break;
            await new Promise(r => setTimeout(r, 500));
          }
        }
        if (!sock || connectionStatus !== 'ready') {
          reply(true, {
            sent: false,
            reason: 'not_ready',
            status: connectionStatus,
            error: lastError || 'WhatsApp belum terhubung.',
          });
          break;
        }
        try {
          const text = buildNotificationMessage(transaction);
          await doSend(ownerNumber, text);
          reply(true, { sent: true });
        } catch (e) {
          reply(true, { sent: false, reason: 'send_failed', error: e.message });
        }
        break;
      }

      case 'normalize_number': {
        const { number } = msg;
        reply(true, { normalized: normalizeWhatsAppNumber(number) });
        break;
      }

      default:
        fail(`Unknown command: ${type}`);
    }
  } catch (err) {
    fail(err.message || String(err));
  }
}

// ─── Stdin listener ──────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    handleMessage(msg).catch((e) => {
      send({ type: 'result', id: msg.id, ok: false, error: e.message, ts: Date.now() });
    });
  } catch (e) {
    send({ type: 'error', error: `Invalid JSON: ${e.message}`, ts: Date.now() });
  }
});

// ─── Graceful shutdown ──────────────────────────────────────────────
function shutdown() {
  shouldReconnect = false;
  if (sock) {
    try { sock.end(); } catch {}
  }
  log('info', 'wa-service shutting down');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

// ─── Ready ───────────────────────────────────────────────────────────
send({ type: 'ready', service: 'wa-service', version: '1.0.0', ts: Date.now() });
