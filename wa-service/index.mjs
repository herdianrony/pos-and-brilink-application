/**
 * wa-service — WhatsApp Sidecar for Tauri (HTTP REST API)
 *
 * Communication: HTTP REST on localhost
 *   GET  /status        → { status, hasQr, hasClient, ownerNumber, autoNotify, uptime, memoryMb }
 *   GET  /qr            → { qr: "data:image/png;base64,..." }
 *   POST /send          → { phone, message } → { success }
 *   POST /start         → { } → { status }
 *   POST /restart       → { } → { status }
 *   POST /logout        → { } → { success }
 *
 * All endpoints are bound to 127.0.0.1 only for security.
 */

import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ─── Configuration ─────────────────────────────────────────────
const PORT = parseInt(process.env.WA_PORT || '17532', 10);
const SESSION_DIR = process.env.WA_SESSION_DIR ||
  path.join(os.homedir(), '.pos-brilink', 'whatsapp-session');

// ─── State ─────────────────────────────────────────────────────
let sock = null;
let connectionStatus = 'idle'; // idle | initializing | qr | connecting | ready | disconnected | error
let qrDataUrl = null;
let lastError = null;
let shouldReconnect = true;
let startTime = Date.now();

// ─── Helpers ───────────────────────────────────────────────────
function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

function setStatus(s, err) {
  connectionStatus = s;
  if (err !== undefined) lastError = err || null;
  console.log(`[WA] Status: ${s}${err ? ' — ' + err : ''}`);
}

// ─── WhatsApp Connection ───────────────────────────────────────
async function connectToWhatsApp() {
  if (sock || connectionStatus === 'initializing' || connectionStatus === 'connecting') {
    return;
  }

  setStatus('initializing');
  lastError = null;
  qrDataUrl = null;

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
        warn: (msg) => console.warn('[WA]', msg),
        error: (msg) => console.error('[WA]', msg),
        trace: () => {},
        fatal: (msg) => console.error('[WA] FATAL:', msg),
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
  // Clean session files
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

// ─── Express Server ────────────────────────────────────────────
const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'wa-engine', version: '2.0.0' });
});

// GET /status
app.get('/status', (_req, res) => {
  res.json({
    status: connectionStatus,
    hasQr: !!qrDataUrl,
    hasClient: !!sock,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    lastError,
  });
});

// GET /qr
app.get('/qr', (_req, res) => {
  if (qrDataUrl) {
    res.json({ qr: qrDataUrl });
  } else if (connectionStatus === 'ready') {
    res.status(200).json({ qr: null, message: 'Sudah terhubung' });
  } else {
    res.status(404).json({ error: 'QR belum tersedia' });
  }
});

// POST /start
app.post('/start', async (_req, res) => {
  try {
    await connectToWhatsApp();
    res.json({ status: connectionStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /restart
app.post('/restart', async (_req, res) => {
  try {
    await doRestart();
    res.json({ status: connectionStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /logout
app.post('/logout', async (_req, res) => {
  try {
    await doLogout();
    res.json({ success: true, status: connectionStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /send
app.post('/send', async (req, res) => {
  const { phone, message } = req.body;

  if (connectionStatus !== 'ready') {
    return res.status(400).json({ error: `WhatsApp belum terhubung (status: ${connectionStatus})` });
  }
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone dan message wajib diisi' });
  }

  try {
    await doSend(phone, message);
    res.json({ success: true, message: 'Pesan berhasil dikirim' });
  } catch (err) {
    res.status(500).json({ error: `Gagal mengirim: ${err.message}` });
  }
});

// ─── Graceful Shutdown ─────────────────────────────────────────
function shutdown() {
  shouldReconnect = false;
  if (sock) {
    try { sock.end(); } catch {}
  }
  console.log('[WA] Shutting down');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

// ─── Start ─────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[WA Sidecar] Server running on http://127.0.0.1:${PORT}`);
  console.log(`[WA Sidecar] Session dir: ${SESSION_DIR}`);
  // Auto-connect on start
  connectToWhatsApp();
});
