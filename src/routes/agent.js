/**
 * Agent service template & fee tier routes.
 */

import { Router } from 'express';
import { getDb, logError, roundMoney, recordLog } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/agent/services
router.get('/agent/services', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const rows = db.prepare('SELECT * FROM agent_service_templates WHERE is_active = 1 ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'agent', `List services error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/services
router.post('/agent/services', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { name, category, default_fee, provider_cost } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama layanan wajib diisi' });
    }

    const existing = db.prepare('SELECT id FROM agent_service_templates WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ error: 'Nama layanan sudah digunakan' });
    }

    const fee = roundMoney(default_fee || 0);
    const cost = roundMoney(provider_cost || 0);
    const now = new Date().toISOString();

    const result = db.prepare(
      'INSERT INTO agent_service_templates (name, category, default_fee, provider_cost, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
    ).run(name, category || null, fee, cost, now, now);

    const service = db.prepare('SELECT * FROM agent_service_templates WHERE id = ?').get(result.lastInsertRowid);
    recordLog(db, 'INFO', 'agent', `Layanan dibuat: ${name}`);
    res.json(service);
  } catch (err) {
    logError(getDb(), 'agent', `Create service error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/services/:id/fees
router.get('/agent/services/:id/fees', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    const service = db.prepare('SELECT * FROM agent_service_templates WHERE id = ? AND is_active = 1').get(id);
    if (!service) {
      return res.status(404).json({ error: 'Layanan tidak ditemukan' });
    }

    const fees = db.prepare('SELECT * FROM agent_fee_tiers WHERE service_id = ? ORDER BY min_amount').all(id);
    res.json(fees);
  } catch (err) {
    logError(getDb(), 'agent', `List fee tiers error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/services/:id/fees
router.post('/agent/services/:id/fees', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { min_amount, max_amount, fee, provider_cost } = req.body;

    const service = db.prepare('SELECT * FROM agent_service_templates WHERE id = ? AND is_active = 1').get(id);
    if (!service) {
      return res.status(404).json({ error: 'Layanan tidak ditemukan' });
    }

    const minAmt = roundMoney(min_amount || 0);
    const maxAmt = max_amount !== undefined && max_amount !== null ? roundMoney(max_amount) : null;
    const feeAmt = roundMoney(fee || 0);
    const costAmt = roundMoney(provider_cost || 0);
    const now = new Date().toISOString();

    const result = db.prepare(
      'INSERT INTO agent_fee_tiers (service_id, min_amount, max_amount, fee, provider_cost, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, minAmt, maxAmt, feeAmt, costAmt, now);

    const tier = db.prepare('SELECT * FROM agent_fee_tiers WHERE id = ?').get(result.lastInsertRowid);
    recordLog(db, 'INFO', 'agent', `Fee tier dibuat: ${service.name} ${minAmt}-${maxAmt || '∞'}`);
    res.json(tier);
  } catch (err) {
    logError(getDb(), 'agent', `Create fee tier error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
