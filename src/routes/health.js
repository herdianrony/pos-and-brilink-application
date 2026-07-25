/**
 * Health & Setup routes.
 */

import { Router } from 'express';
import { getDb, getDbPath, getAppDir } from '../config/database.js';

const router = Router();

// GET /api/health
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'CatatAgen Local',
    backend: 'express',
    timestamp: new Date().toISOString(),
  });
});

// POST /api/db/init
router.post('/db/init', (_req, res) => {
  try {
    const db = getDb();
    res.json({ ok: true, path: getDbPath() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/setup/status
router.get('/setup/status', (_req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1').get();
    res.json({
      setup_needed: (row?.cnt || 0) === 0,
      user_count: row?.cnt || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
