/**
 * WhatsApp routes — integrated Baileys (no separate sidecar process).
 *
 * Baileys runs in-process, managed via these API endpoints.
 * Session files stored in app data directory.
 */

import { Router } from 'express';
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getAppDir, getDb, logError, recordLog } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ── State ──────────────────────────────────────────────────────────
let sock = null;
let connectionStatus = 'idle';
let qrDataUrl = null;
let lastError = null;
let shouldReconnect = true;
let startTime = Date.now();

const SESSION_DIR = path.join(getAppDir(), 'whatsapp-session');

function setStatus(s, err) {
  connectionStatus = s;
  if (err !== undefined) lastError = err || null;
  console.log(`[WA] Status: ${s}${err ? ' — ' + err : ''}`);
}

function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

// ── WhatsApp Connection ──────────────────────────────────────────

async function connectToWhatsApp() {
  if (sock || connectionStatus === 'initializing' || connectionStatus === 'connecting') return;

  setStatus('initializing');
  lastError = null;
  qrDataUrl = null;

  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
  } catch {}

  try {
    const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = await import('@whiskeysockets/baileys');
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      logger: {
        level: 'silent',
        info: () => {}, debug: () => {},
        warn: (msg) => console.warn('[WA]', msg),
        error: (msg) => console.error('[WA]', msg),
        trace: () => {}, fatal: (msg) => console.error('[WA] FATAL:', msg),
        child: () => ({
          level: 'silent', info: () => {}, debug: () => {},
          warn: () => {}, error: () => {}, trace: () => {},
          fatal: () => {}, child: () => {},
        }),
      },
      shouldSyncHistoryMessage: () => false,
      getMessage: () => Promise.resolve({}),
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('[WA] QR received');
        try {
          qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
          setStatus('qr');
        } catch (e) {
          console.error('[WA] QR encode failed:', e.message);
        }
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const msg = lastDisconnect?.error?.message || 'Connection closed';
        console.log(`[WA] Connection closed: ${code} — ${msg}`);
        sock = null;

        if (code === DisconnectReason.loggedOut) {
          setStatus('disconnected', 'Session di-logout dari perangkat lain');
        } else if (shouldReconnect) {
          setStatus('connecting', msg);
          console.log('[WA] Reconnecting in 3s...');
          setTimeout(() => connectToWhatsApp(), 3000);
        } else {
          setStatus('disconnected', msg);
        }
      }

      if (connection === 'open') {
        qrDataUrl = null;
        setStatus('ready');
        console.log('[WA] Connected & ready!');
      }
    });

    sock.ev.on('creds.update', saveCreds);
    setStatus('connecting');
  } catch (err) {
    console.error('[WA] Init failed:', err.message);
    setStatus('error', err.message);
    sock = null;
  }
}

async function doSend(to, message) {
  const number = normalizePhone(to);
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
  qrDataUrl = null;
  setStatus('disconnected');
  try {
    const files = fs.readdirSync(SESSION_DIR);
    for (const f of files) {
      fs.rmSync(path.join(SESSION_DIR, f), { recursive: true, force: true });
    }
  } catch {}
}

async function doRestart() {
  if (sock) {
    try { sock.end(); } catch {}
    sock = null;
  }
  qrDataUrl = null;
  lastError = null;
  connectionStatus = 'idle';
  await connectToWhatsApp();
}

function getWhatsAppSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  let enabled = false;
  let autoNotify = false;
  let ownerNumber = '';
  for (const row of rows) {
    if (row.key === 'whatsapp_enabled') enabled = row.value === 'true';
    if (row.key === 'whatsapp_auto_notify_owner') autoNotify = row.value === 'true';
    if (row.key === 'whatsapp_owner_number') ownerNumber = row.value;
  }
  return { enabled, autoNotify, ownerNumber };
}

// ── Routes ──────────────────────────────────────────────────────────

// GET /api/whatsapp/status
router.get('/whatsapp/status', requireAuth, requireAdmin, (_req, res) => {
  try {
    const { enabled, autoNotify, ownerNumber } = getWhatsAppSettings();

    res.json({
      status: connectionStatus,
      qr_data_url: connectionStatus === 'qr' ? qrDataUrl : null,
      last_error: lastError,
      has_client: !!sock,
      enabled,
      auto_notify_owner: autoNotify,
      owner_number: ownerNumber || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/start
router.post('/whatsapp/start', requireAuth, requireAdmin, async (_req, res) => {
  try {
    await connectToWhatsApp();
    recordLog(getDb(), 'INFO', 'whatsapp', 'WhatsApp dimulai');

    // Return current status after brief wait
    setTimeout(() => {
      res.json({
        status: connectionStatus,
        qr_data_url: connectionStatus === 'qr' ? qrDataUrl : null,
        last_error: lastError,
        has_client: !!sock,
      });
    }, 500);
  } catch (err) {
    logError(getDb(), 'whatsapp', `Start error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/restart
router.post('/whatsapp/restart', requireAuth, requireAdmin, async (_req, res) => {
  try {
    await doRestart();
    recordLog(getDb(), 'INFO', 'whatsapp', 'WhatsApp di-restart');

    setTimeout(() => {
      res.json({
        status: connectionStatus,
        qr_data_url: connectionStatus === 'qr' ? qrDataUrl : null,
        last_error: lastError,
        has_client: !!sock,
      });
    }, 500);
  } catch (err) {
    logError(getDb(), 'whatsapp', `Restart error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/logout
router.post('/whatsapp/logout', requireAuth, requireAdmin, async (_req, res) => {
  try {
    await doLogout();
    recordLog(getDb(), 'INFO', 'whatsapp', 'WhatsApp logout');
    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'whatsapp', `Logout error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/notify — send transaction notification
router.post('/whatsapp/notify', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { transaction_id } = req.body;
    const { enabled, autoNotify, ownerNumber } = getWhatsAppSettings();

    if (!enabled || !autoNotify) {
      return res.json({ sent: false, reason: 'disabled' });
    }
    if (!ownerNumber) {
      return res.json({ sent: false, reason: 'missing_owner_number' });
    }
    if (!sock || connectionStatus !== 'ready') {
      return res.json({ sent: false, reason: 'sidecar_not_ready' });
    }

    const db = getDb();
    const trx = db.prepare(
      'SELECT invoice_no, type, total_amount, customer_name, status, created_at FROM transactions WHERE id = ?'
    ).get(transaction_id);

    if (!trx) {
      return res.status(404).json({ sent: false, reason: 'transaction_not_found' });
    }

    const customer = trx.customer_name || '-';
    let message;
    if (trx.type === 'pos') {
      message = `[NOTIFIKASI TRANSAKSI POS]\n\nInvoice: ${trx.invoice_no}\nTipe: Penjualan POS\nNominal: Rp${Math.round(trx.total_amount)}\nPelanggan: ${customer}\nStatus: ${trx.status}\nTanggal: ${trx.created_at}\n\nTercatat otomatis oleh CatatAgen Local`;
    } else if (trx.type === 'brilink') {
      message = `[NOTIFIKASI TRANSAKSI BRILINK]\n\nInvoice: ${trx.invoice_no}\nTipe: Layanan Agen\nNominal: Rp${Math.round(trx.total_amount)}\nPelanggan: ${customer}\nStatus: ${trx.status}\nTanggal: ${trx.created_at}\n\nTercatat otomatis oleh CatatAgen Local`;
    } else {
      message = `[NOTIFIKASI TRANSAKSI]\n\nInvoice: ${trx.invoice_no}\nTipe: ${trx.type}\nNominal: Rp${Math.round(trx.total_amount)}\nPelanggan: ${customer}\nStatus: ${trx.status}\nTanggal: ${trx.created_at}\n\nTercatat otomatis oleh CatatAgen Local`;
    }

    await doSend(ownerNumber, message);
    recordLog(db, 'INFO', 'whatsapp', `WA notif dikirim untuk trx #${transaction_id}`);
    res.json({ sent: true, reason: null, id: null });
  } catch (err) {
    logError(getDb(), 'whatsapp', `Notify error: ${err.message}`);
    res.json({ sent: false, reason: `send_failed: ${err.message}` });
  }
});

export default router;
