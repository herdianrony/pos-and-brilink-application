/**
 * Auth middleware — session-based authentication.
 *
 * Sessions are stored in-memory (HashMap). For a single-user desktop app
 * this is sufficient. The session is also persisted to a JSON file so it
 * survives Express restarts.
 *
 * Admin-only routes use requireAdmin().
 */

import fs from 'node:fs';
import path from 'node:path';
import { getAppDir } from '../config/database.js';

// ── Session store ──────────────────────────────────────────────

const SESSION_FILE = path.join(getAppDir(), 'session.json');

/** Map: sessionToken → { userId, username, role, createdAt } */
const sessions = new Map();

/** Rate limiter for login attempts: Map<username, { count, lastAttempt }> */
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

// Load persisted session on startup
function loadSessions() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      if (data && data.token && data.user) {
        sessions.set(data.token, data.user);
        console.log('[Auth] Restored session for', data.user.username);
      }
    }
  } catch {
    // ignore corrupt session file
  }
}

function saveSession(token, user) {
  sessions.set(token, user);
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ token, user }, null, 2));
  } catch { /* ignore write failures */ }
}

function clearSessionFile() {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  } catch { /* ignore */ }
}

loadSessions();

// ── Middleware ─────────────────────────────────────────────────

/**
 * Express middleware: require a valid session.
 * Attaches `req.user` if valid, otherwise returns 401.
 */
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Belum login atau sesi telah berakhir' });
  }
  req.user = sessions.get(token);
  req.sessionToken = token;
  next();
}

/**
 * Express middleware: require admin role.
 * Must be used AFTER requireAuth.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses hanya untuk admin' });
  }
  next();
}

// ── Login rate limiter ────────────────────────────────────────

export function checkLoginRateLimit(username) {
  const now = Date.now();
  const record = loginAttempts.get(username);

  if (record && record.count >= MAX_LOGIN_ATTEMPTS) {
    if (now - record.lastAttempt < LOCKOUT_MS) {
      const remaining = Math.ceil((LOCKOUT_MS - (now - record.lastAttempt)) / 1000);
      throw new Error(`Terlalu banyak percobaan login. Coba lagi dalam ${remaining} detik.`);
    }
    // Lockout expired, reset
    loginAttempts.delete(username);
  }
}

export function recordFailedLogin(username) {
  const now = Date.now();
  const record = loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
  record.count += 1;
  record.lastAttempt = now;
  loginAttempts.set(username, record);
}

export function clearLoginAttempts(username) {
  loginAttempts.delete(username);
}

// ── Session management ────────────────────────────────────────

export function createSession(user) {
  const token = crypto.randomUUID();
  const sessionData = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: new Date().toISOString(),
  };
  saveSession(token, sessionData);
  return token;
}

export function destroySession(token) {
  sessions.delete(token);
  clearSessionFile();
}

export function getSession(token) {
  return sessions.get(token) || null;
}

// ── Helpers ───────────────────────────────────────────────────

function extractToken(req) {
  // Check Authorization header first, then query param
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.query?._token || req.headers['x-session-token'] || null;
}
