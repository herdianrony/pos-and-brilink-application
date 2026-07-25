/**
 * Auth & User routes — login, logout, session, user CRUD.
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, logError, validatePassword } from '../config/database.js';
import { requireAuth, requireAdmin, createSession, destroySession, checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/setup — create first admin user
router.post('/auth/setup', (req, res) => {
  try {
    const db = getDb();
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Nama, username, dan password wajib diisi' });
    }
    validatePassword(password);

    // Check if any admin already exists
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ? AND is_active = 1').get('admin');
    if (existing.cnt > 0) {
      return res.status(400).json({ error: 'Admin sudah terdaftar' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const result = db.prepare(
      'INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
    ).run(name, username, hash, 'admin', now, now);

    const user = db.prepare('SELECT id, name, username, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.json(user);
  } catch (err) {
    logError(getDb(), 'auth', `Setup gagal: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  try {
    const db = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    // Rate limiting
    checkLoginRateLimit(username);

    const user = db.prepare('SELECT id, name, username, password_hash, role, is_active FROM users WHERE username = ? AND is_active = 1').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      recordFailedLogin(username);
      db.prepare(
        "INSERT INTO app_logs (level, source, message, created_at) VALUES ('WARN', 'auth', ?, ?)"
      ).run(`Login gagal: ${username}`, new Date().toISOString());
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    clearLoginAttempts(username);

    // Create session
    const token = createSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    db.prepare(
      "INSERT INTO app_logs (level, source, message, created_at) VALUES ('INFO', 'auth', ?, ?)"
    ).run(`Login berhasil: ${user.name} (${user.role})`, new Date().toISOString());

    res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) {
    logError(getDb(), 'auth', `Login error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.body?.token;
    if (token) destroySession(token);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — get current session user
router.get('/auth/me', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query?._token;
    if (!token) return res.status(401).json({ error: 'Tidak ada sesi' });

    const { getSession } = require('../middleware/auth.js');
    const user = getSession(token);
    if (!user) return res.status(401).json({ error: 'Sesi tidak valid' });

    const db = getDb();
    const dbUser = db.prepare('SELECT id, name, username, role FROM users WHERE id = ? AND is_active = 1').get(user.userId);
    if (!dbUser) {
      destroySession(token);
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }

    res.json(dbUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User CRUD (admin only) ────────────────────────────────────

// GET /api/users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, username, role, is_active as isActive, created_at as createdAt FROM users ORDER BY created_at DESC').all();
    // Map isActive back to is_active for frontend compatibility
    const users = rows.map(r => ({
      id: r.id,
      name: r.name,
      username: r.username,
      role: r.role,
      is_active: r.isActive,
      created_at: r.createdAt,
    }));
    res.json(users);
  } catch (err) {
    logError(getDb(), 'auth', `List users error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — create user
router.post('/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    if (!['admin', 'kasir'].includes(role)) {
      return res.status(400).json({ error: 'Role harus admin atau kasir' });
    }
    validatePassword(password);

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const result = db.prepare(
      'INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
    ).run(name, username, hash, role, now, now);

    const user = db.prepare('SELECT id, name, username, role FROM users WHERE id = ?').get(result.lastInsertRowid);

    db.prepare(
      "INSERT INTO app_logs (level, source, message, created_at) VALUES ('INFO', 'auth', ?, ?)"
    ).run(`User dibuat: ${username}`, new Date().toISOString());

    res.json(user);
  } catch (err) {
    logError(getDb(), 'auth', `Create user error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users — update user
router.put('/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id, name, username, password, role } = req.body;

    if (!id || !name || !username || !role) {
      return res.status(400).json({ error: 'ID, nama, username, dan role wajib diisi' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const now = new Date().toISOString();
    if (password && password.length > 0) {
      validatePassword(password);
      const hash = bcrypt.hashSync(password, 10);
      db.prepare(
        'UPDATE users SET name = ?, username = ?, password_hash = ?, role = ?, updated_at = ? WHERE id = ?'
      ).run(name, username, hash, role, now, id);
    } else {
      db.prepare(
        'UPDATE users SET name = ?, username = ?, role = ?, updated_at = ? WHERE id = ?'
      ).run(name, username, role, now, id);
    }

    db.prepare(
      "INSERT INTO app_logs (level, source, message, created_at) VALUES ('INFO', 'auth', ?, ?)"
    ).run(`User diupdate: ${username}`, new Date().toISOString());

    res.json({ id, name, username, role });
  } catch (err) {
    logError(getDb(), 'auth', `Update user error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users — deactivate user
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Tidak bisa menonaktifkan diri sendiri' });
    }

    const user = db.prepare('SELECT id, name FROM users WHERE id = ? AND is_active = 1').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id);

    db.prepare(
      "INSERT INTO app_logs (level, source, message, created_at) VALUES ('WARN', 'auth', ?, ?)"
    ).run(`User dinonaktifkan: ${user.name}`, new Date().toISOString());

    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'auth', `Deactivate user error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
