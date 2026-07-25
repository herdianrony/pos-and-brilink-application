/**
 * Backup & Log routes — database backup, restore, and app logs.
 */

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, logError, recordLog, getAppDir } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const BACKUP_DIR = () => path.join(getAppDir(), 'backups');
const DB_PATH = () => path.join(getAppDir(), 'data', 'catatagen.db');

function ensureBackupDir() {
  const dir = BACKUP_DIR();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// GET /api/backups
router.get('/backups', requireAuth, requireAdmin, (_req, res) => {
  try {
    const dir = ensureBackupDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(dir, f);
        const stat = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stat.size,
          created_at: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.name.localeCompare(a.name));
    res.json(files);
  } catch (err) {
    logError(getDb(), 'backup', `List backups error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backups
router.post('/backups', requireAuth, requireAdmin, (_req, res) => {
  try {
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');

    const src = DB_PATH();
    if (!fs.existsSync(src)) {
      return res.status(404).json({ error: 'Database belum ditemukan' });
    }

    const dir = ensureBackupDir();
    const now = new Date();
    const name = `catatagen-backup-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.db`;
    const target = path.join(dir, name);

    fs.copyFileSync(src, target);
    const stat = fs.statSync(target);

    recordLog(db, 'INFO', 'backup', `Backup dibuat: ${name}`);

    res.json({
      name,
      path: target,
      size: stat.size,
      created_at: now.toISOString(),
    });
  } catch (err) {
    logError(getDb(), 'backup', `Create backup error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backups/restore
router.post('/backups/restore', requireAuth, requireAdmin, (req, res) => {
  try {
    const { backupPath, path: restorePath } = req.body;
    const backupFile = restorePath || backupPath;
    if (!backupFile) {
      return res.status(400).json({ error: 'Path file backup wajib diisi' });
    }

    const allowedDir = ensureBackupDir();
    const resolvedPath = path.resolve(backupFile);

    // Security: only allow restoring from the backup directory
    if (!resolvedPath.startsWith(path.resolve(allowedDir))) {
      return res.status(400).json({ error: 'File backup tidak valid' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File backup tidak ditemukan' });
    }

    const target = DB_PATH();

    // Create pre-restore backup
    if (fs.existsSync(target)) {
      const now = new Date();
      const preRestoreName = `pre-restore-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.db`;
      fs.copyFileSync(target, path.join(allowedDir, preRestoreName));
    }

    // Remove WAL/SHM files
    try { fs.unlinkSync(target + '-wal'); } catch {}
    try { fs.unlinkSync(target + '-shm'); } catch {}

    // Copy backup over database
    fs.copyFileSync(resolvedPath, target);

    const db = getDb();
    recordLog(db, 'WARN', 'backup', `Database direstore dari ${path.basename(resolvedPath)}`);

    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'backup', `Restore backup error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs
router.get('/logs', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 80, 500);
    const rows = db.prepare(
      'SELECT id, level, source, message, created_at FROM app_logs ORDER BY id DESC LIMIT ?'
    ).all(limit);
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'transactions', `List logs error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
