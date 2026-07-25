/**
 * Settings routes — get/update app settings (admin only).
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, logError, recordLog } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const ALLOWED_KEYS = [
  'app_name', 'store_name', 'store_owner_name', 'store_phone', 'store_address',
  'business_type', 'max_discount_percent', 'max_discount_amount', 'discount_admin_pin',
  'printer_host', 'printer_port', 'printer_paper_width', 'receipt_footer',
  'whatsapp_owner_number', 'whatsapp_enabled', 'whatsapp_auto_notify_owner', 'kas_only',
];

// GET /api/settings
router.get('/settings', requireAuth, (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const map = {};
    for (const row of rows) {
      if (row.key === 'discount_admin_pin') {
        map['discount_admin_pin_set'] = row.value ? 'true' : 'false';
      } else {
        map[row.key] = row.value;
      }
    }
    res.json(map);
  } catch (err) {
    logError(getDb(), 'settings', `Get settings error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/settings', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object wajib diisi' });
    }

    // Validate keys
    for (const key of Object.keys(settings)) {
      if (!ALLOWED_KEYS.includes(key)) {
        return res.status(400).json({ error: `Pengaturan '${key}' tidak diizinkan` });
      }
    }

    const now = new Date().toISOString();

    const upsert = db.transaction(() => {
      const upsertStmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);

      for (const [key, value] of Object.entries(settings)) {
        // Skip masked pin
        if (key === 'discount_admin_pin' && (value === '****' || value === '')) continue;

        let processedValue = value;
        if (key === 'discount_admin_pin') {
          processedValue = bcrypt.hashSync(value, 10);
        }

        upsertStmt.run(key, processedValue, now);
      }
    });

    upsert();
    recordLog(db, 'INFO', 'settings', `Settings diupdate: ${Object.keys(settings).join(', ')}`);
    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'settings', `Update settings error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
