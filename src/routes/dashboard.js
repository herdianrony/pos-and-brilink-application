/**
 * Dashboard & POS Report routes.
 */

import { Router } from 'express';
import { getDb, logError, roundMoney } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const isAdmin = req.user.role === 'admin';

    // Today's date in local timezone
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;

    // Helper to compute today stats
    function todayStats(typeFilter) {
      const row = db.prepare(`
        SELECT COUNT(*) as count,
               COALESCE(SUM(total_amount), 0) as revenue,
               COALESCE(SUM(profit), 0) as profit
        FROM transactions
        WHERE created_at >= ? AND status NOT IN ('void', 'reversed')
          AND (? = '' OR type = ?)
      `).get(todayStr, typeFilter || '', typeFilter || '');

      return {
        count: row.count,
        revenue: row.revenue,
        profit: isAdmin ? row.profit : 0,
      };
    }

    const today_all = todayStats('');
    const today_pos = todayStats('pos');
    const today_brilink = todayStats('brilink');

    // Low stock
    const lowStock = db.prepare(
      'SELECT id, name, stock, min_stock FROM products WHERE is_active = 1 AND stock <= min_stock ORDER BY stock ASC LIMIT 10'
    ).all();

    // Recent transactions
    const recent = db.prepare(
      'SELECT id, invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at, user_id FROM transactions WHERE status NOT IN (\'void\', \'reversed\') ORDER BY id DESC LIMIT 8'
    ).all().map(row => ({
      ...row,
      profit: isAdmin ? row.profit : 0,
    }));

    // Last 7 days
    const dailyMap = {};
    const dailyRows = db.prepare(`
      SELECT date(created_at) as d,
             COALESCE(SUM(total_amount), 0) as revenue,
             COALESCE(SUM(profit), 0) as profit
      FROM transactions
      WHERE created_at >= datetime('now', '-7 days') AND status NOT IN ('void', 'reversed')
      GROUP BY d ORDER BY d
    `).all();

    for (const row of dailyRows) {
      dailyMap[row.d] = { revenue: row.revenue, profit: isAdmin ? row.profit : 0 };
    }

    const last_7_days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const data = dailyMap[dateStr] || { revenue: 0, profit: 0 };
      last_7_days.push({ date: dateStr, ...data });
    }

    // Accounts summary
    const accounts = db.prepare('SELECT id, name, balance FROM accounts WHERE is_active = 1 ORDER BY id ASC').all();

    // Pending count
    const pending = db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE status = 'pending'").get().cnt;

    res.json({
      today_all, today_pos, today_brilink,
      low_stock: lowStock,
      recent_transactions: recent,
      last_7_days,
      accounts,
      pending_count: pending,
    });
  } catch (err) {
    logError(getDb(), 'dashboard', `Get dashboard error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/pos-report
router.get('/dashboard/pos-report', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { start, end } = req.query;
    const now = new Date();

    const startDate = start ? `${start}T00:00:00` : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
    const endDate = end ? `${end}T23:59:59` : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T23:59:59`;

    // Summary
    const summary = db.prepare(`
      SELECT COUNT(*) as count,
             COALESCE(SUM(total_amount), 0) as revenue,
             COALESCE(SUM(profit), 0) as profit,
             COALESCE(AVG(total_amount), 0) as average
      FROM transactions
      WHERE type = 'pos' AND status NOT IN ('void', 'reversed')
        AND created_at >= ? AND created_at <= ?
    `).get(startDate, endDate);
    summary.cogs = roundMoney(summary.revenue - summary.profit);

    // By payment method
    const by_payment = db.prepare(`
      SELECT payment_method, COUNT(*) as count,
             COALESCE(SUM(total_amount), 0) as revenue,
             COALESCE(SUM(profit), 0) as profit
      FROM transactions
      WHERE type = 'pos' AND status NOT IN ('void', 'reversed')
        AND created_at >= ? AND created_at <= ?
      GROUP BY payment_method ORDER BY COUNT(*) DESC
    `).all(startDate, endDate);

    // Product ranking
    const products = db.prepare(`
      SELECT ti.product_name,
             SUM(ti.quantity) as quantity,
             SUM(ti.subtotal) as revenue,
             SUM(ti.subtotal - ti.quantity * (SELECT p.buy_price FROM products p WHERE p.id = ti.product_id)) as profit
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.type = 'pos' AND t.status NOT IN ('void', 'reversed')
        AND t.created_at >= ? AND t.created_at <= ?
      GROUP BY ti.product_id ORDER BY SUM(ti.subtotal) DESC LIMIT 50
    `).all(startDate, endDate);

    // Daily breakdown
    const daily = db.prepare(`
      SELECT date(created_at) as d,
             COALESCE(SUM(total_amount), 0) as revenue,
             COALESCE(SUM(profit), 0) as profit
      FROM transactions
      WHERE type = 'pos' AND status NOT IN ('void', 'reversed')
        AND created_at >= ? AND created_at <= ?
      GROUP BY d ORDER BY d
    `).all(startDate, endDate);

    res.json({ summary, by_payment, products, daily });
  } catch (err) {
    logError(getDb(), 'dashboard', `POS report error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
