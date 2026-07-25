/**
 * Debt routes — CRUD, payments, WhatsApp reminders.
 */

import { Router } from 'express';
import { getDb, logError, roundMoney, validateMoney, recordLog } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/debts
router.get('/debts', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const rows = db.prepare(`
      SELECT d.*, COALESCE(SUM(dp.amount), 0) as total_paid
      FROM debts d
      LEFT JOIN debt_payments dp ON dp.debt_id = d.id
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT ?
    `).all(limit);
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'debts', `List debts error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/debts
router.post('/debts', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { customer_name, phone, amount, notes } = req.body;

    if (!customer_name || !amount) {
      return res.status(400).json({ error: 'Nama pelanggan dan jumlah wajib diisi' });
    }

    const debtAmount = validateMoney(amount, 'Jumlah hutang');
    const now = new Date().toISOString();

    const result = db.prepare(
      'INSERT INTO debts (customer_name, phone, amount, paid_amount, status, notes, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)'
    ).run(customer_name, phone || null, debtAmount, 'open', notes || null, now, now);

    const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(result.lastInsertRowid);
    recordLog(db, 'INFO', 'debts', `Hutang dibuat: ${customer_name} sebesar ${debtAmount}`);
    res.json(debt);
  } catch (err) {
    logError(getDb(), 'debts', `Create debt error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/debts/:id/payment
router.post('/debts/:id/payment', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { amount, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Jumlah pembayaran wajib diisi dan harus positif' });
    }

    const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
    if (!debt) {
      return res.status(404).json({ error: 'Hutang tidak ditemukan' });
    }

    const payAmount = roundMoney(Number(amount));
    const outstanding = roundMoney(debt.amount - debt.paid_amount);

    if (payAmount > outstanding) {
      return res.status(400).json({ error: `Pembayaran melebihi sisa hutang (${outstanding})` });
    }

    const now = new Date().toISOString();

    const doPayment = db.transaction(() => {
      db.prepare(
        'INSERT INTO debt_payments (debt_id, amount, notes, created_at) VALUES (?, ?, ?, ?)'
      ).run(id, payAmount, notes || null, now);

      const newPaidAmount = roundMoney(debt.paid_amount + payAmount);
      const newStatus = newPaidAmount >= debt.amount ? 'paid' : 'open';

      db.prepare(
        'UPDATE debts SET paid_amount = ?, status = ?, updated_at = ? WHERE id = ?'
      ).run(newPaidAmount, newStatus, now, id);

      return { paid_amount: newPaidAmount, status: newStatus };
    });

    const result = doPayment();
    const updated = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
    recordLog(db, 'INFO', 'debts', `Pembayaran hutang: ${debt.customer_name} sebesar ${payAmount}`);
    res.json(updated);
  } catch (err) {
    logError(getDb(), 'debts', `Debt payment error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debts/:id/reminder
router.get('/debts/:id/reminder', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
    if (!debt) {
      return res.status(404).json({ error: 'Hutang tidak ditemukan' });
    }

    const outstanding = roundMoney(debt.amount - debt.paid_amount);
    const payments = db.prepare('SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY created_at').all(id);

    let paymentHistory = '';
    if (payments.length > 0) {
      paymentHistory = payments.map(p => {
        const date = new Date(p.created_at).toLocaleDateString('id-ID');
        return `  - ${date}: Rp ${p.amount.toLocaleString('id-ID')}${p.notes ? ` (${p.notes})` : ''}`;
      }).join('\n');
    }

    const text = `*REMINDER HUTANG*\n\n` +
      `Yth. ${debt.customer_name}${debt.phone ? ` (${debt.phone})` : ''},\n\n` +
      `Berikut detail hutang Anda:\n` +
      `Total Hutang : Rp ${debt.amount.toLocaleString('id-ID')}\n` +
      `Sudah Dibayar: Rp ${debt.paid_amount.toLocaleString('id-ID')}\n` +
      `Sisa Hutang  : Rp ${outstanding.toLocaleString('id-ID')}\n` +
      `Status       : ${debt.status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}\n` +
      `Tanggal      : ${new Date(debt.created_at).toLocaleDateString('id-ID')}\n` +
      (debt.notes ? `Catatan      : ${debt.notes}\n` : '') +
      (paymentHistory ? `\n*Riwayat Pembayaran:*\n${paymentHistory}\n` : '') +
      `\nMohon segera melunasi hutang Anda. Terima kasih.`;

    res.json({ text, debt_id: id, customer_name: debt.customer_name, outstanding });
  } catch (err) {
    logError(getDb(), 'debts', `Debt reminder error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
