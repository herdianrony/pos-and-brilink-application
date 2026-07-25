/**
 * Accounts routes — CRUD, mutations, transfers, owner draw, bank fee.
 */

import { Router } from 'express';
import { getDb, logError, roundMoney, validateMoney, normalizeCode } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/accounts
router.get('/', requireAuth, (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at ASC').all();
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'accounts', `List accounts: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts
router.post('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { code, name, icon, color, initial_balance, min_balance } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Kode dan nama wajib diisi' });

    const codeNorm = normalizeCode(code);
    const existing = db.prepare('SELECT id FROM accounts WHERE code = ?').get(codeNorm);
    if (existing) return res.status(400).json({ error: 'Kode rekening sudah digunakan' });

    const balance = initial_balance ? roundMoney(validateMoney(initial_balance, 'Saldo awal')) : 0;
    const minBal = min_balance ? roundMoney(validateMoney(min_balance, 'Saldo minimum')) : 0;
    const now = new Date().toISOString();

    const result = db.prepare(
      'INSERT INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
    ).run(codeNorm, name.trim(), icon || null, color || null, balance, minBal, now, now);

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.json(account);
  } catch (err) {
    logError(getDb(), 'accounts', `Create account: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/accounts — update
router.put('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id, name, icon, color, min_balance, is_active } = req.body;
    if (!id) return res.status(400).json({ error: 'ID wajib diisi' });

    const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id);
    if (!account) return res.status(404).json({ error: 'Rekening tidak ditemukan' });

    const now = new Date().toISOString();
    db.prepare(
      'UPDATE accounts SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color), min_balance = COALESCE(?, min_balance), is_active = COALESCE(?, is_active), updated_at = ? WHERE id = ?'
    ).run(
      name ? name.trim() : null,
      icon !== undefined ? icon : null,
      color !== undefined ? color : null,
      min_balance !== undefined ? roundMoney(min_balance) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      now, id
    );
    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'accounts', `Update account: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/:id — deactivate
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND is_active = 1').get(id);
    if (!account) return res.status(404).json({ error: 'Rekening tidak ditemukan atau sudah nonaktif' });

    const now = new Date().toISOString();
    db.prepare('UPDATE accounts SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id);
    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'accounts', `Deactivate account: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/adjust
router.post('/adjust', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { account_id, amount, notes } = req.body;
    if (!account_id || amount === undefined) return res.status(400).json({ error: 'account_id dan amount wajib diisi' });

    const amt = roundMoney(validateMoney(amount, 'Jumlah penyesuaian'));
    const now = new Date().toISOString();

    const result = db.transaction(() => {
      const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(account_id);
      if (!acct) throw new Error('Rekening tidak ditemukan atau sudah nonaktif');

      const newBalance = roundMoney(acct.balance + amt);
      db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?').run(newBalance, now, account_id);
      db.prepare(
        'INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(account_id, amt >= 0 ? 'adjust_in' : 'adjust_out', Math.abs(amt), newBalance, notes || null, now);
      return db.prepare('SELECT * FROM accounts WHERE id = ?').get(account_id);
    })();

    res.json(result);
  } catch (err) {
    logError(getDb(), 'accounts', `Adjust balance: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/transfer
router.post('/transfer', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { from_account_id, to_account_id, amount, notes } = req.body;
    if (!from_account_id || !to_account_id || !amount) return res.status(400).json({ error: 'from_account_id, to_account_id, dan amount wajib diisi' });
    if (from_account_id === to_account_id) return res.status(400).json({ error: 'Akun asal dan tujuan tidak boleh sama' });

    const amt = roundMoney(validateMoney(amount, 'Jumlah transfer'));
    const now = new Date().toISOString();

    db.transaction(() => {
      const from = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(from_account_id);
      if (!from) throw new Error('Akun asal tidak ditemukan');
      if (from.balance < amt) throw new Error('Saldo akun asal tidak mencukupi');

      const to = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(to_account_id);
      if (!to) throw new Error('Akun tujuan tidak ditemukan');

      const fromBal = roundMoney(from.balance - amt);
      const toBal = roundMoney(to.balance + amt);

      db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?').run(fromBal, now, from_account_id);
      db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?').run(toBal, now, to_account_id);

      db.prepare('INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(from_account_id, 'transfer_out', amt, fromBal, notes || 'Transfer keluar', to_account_id, now);
      db.prepare('INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(to_account_id, 'transfer_in', amt, toBal, notes || 'Transfer masuk', from_account_id, now);
    })();

    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'accounts', `Transfer: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/owner-draw
router.post('/owner-draw', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { account_id, amount, notes } = req.body;
    if (!account_id || amount === undefined) return res.status(400).json({ error: 'account_id dan amount wajib diisi' });

    const amt = roundMoney(validateMoney(amount, 'Jumlah tarikan'));
    const now = new Date().toISOString();

    const result = db.transaction(() => {
      const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(account_id);
      if (!acct) throw new Error('Rekening tidak ditemukan');
      if (acct.balance < amt) throw new Error('Saldo tidak mencukupi');

      const newBal = roundMoney(acct.balance - amt);
      db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, account_id);
      db.prepare('INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(account_id, 'owner_draw', amt, newBal, notes || 'Owner draw', now);
      return db.prepare('SELECT * FROM accounts WHERE id = ?').get(account_id);
    })();

    res.json(result);
  } catch (err) {
    logError(getDb(), 'accounts', `Owner draw: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/bank-fee
router.post('/bank-fee', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { account_id, amount, notes } = req.body;
    if (!account_id || amount === undefined) return res.status(400).json({ error: 'account_id dan amount wajib diisi' });

    const amt = roundMoney(validateMoney(amount, 'Biaya bank'));
    const now = new Date().toISOString();

    const result = db.transaction(() => {
      const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(account_id);
      if (!acct) throw new Error('Rekening tidak ditemukan');

      const newBal = roundMoney(acct.balance - amt);
      db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, account_id);
      db.prepare('INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(account_id, 'bank_fee', amt, newBal, notes || 'Biaya bank', now);
      return db.prepare('SELECT * FROM accounts WHERE id = ?').get(account_id);
    })();

    res.json(result);
  } catch (err) {
    logError(getDb(), 'accounts', `Bank fee: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/mutations
router.get('/mutations', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const rows = db.prepare(
      `SELECT am.*, a.name as account_name FROM account_mutations am
       LEFT JOIN accounts a ON a.id = am.account_id
       ORDER BY am.id DESC LIMIT ?`
    ).all(limit);
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'accounts', `List mutations: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/mutation-summary
router.get('/mutation-summary', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { account_id, start_date, end_date } = req.query;

    let query = 'SELECT SUM(CASE WHEN type LIKE \'%_in\' OR type = \'adjust_in\' THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type LIKE \'%_out\' OR type = \'adjust_out\' OR type = \'bank_fee\' OR type = \'owner_draw\' THEN amount ELSE 0 END) as total_out, COUNT(*) as count FROM account_mutations WHERE 1=1';
    const params = [];

    if (account_id) { query += ' AND account_id = ?'; params.push(Number(account_id)); }
    if (start_date) { query += ' AND created_at >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND created_at <= ?'; params.push(end_date); }

    const row = db.prepare(query).get(...params);
    const totalIn = row?.total_in || 0;
    const totalOut = row?.total_out || 0;

    // Get opening balance (balance before first mutation in range)
    let openingBalance = 0;
    if (account_id) {
      const acct = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(Number(account_id));
      if (acct) openingBalance = acct.balance - totalIn + totalOut;
    }

    res.json({
      total_in: totalIn,
      total_out: totalOut,
      net: roundMoney(totalIn - totalOut),
      count: row?.count || 0,
      opening_balance: openingBalance,
      closing_balance: roundMoney(openingBalance + totalIn - totalOut),
    });
  } catch (err) {
    logError(getDb(), 'accounts', `Mutation summary: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
