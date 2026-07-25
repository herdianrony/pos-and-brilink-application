/**
 * Seed & Setup routes — seed_system, setup_complete, setup_status, setup_templates,
 * seed_demo, clear_demo.
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, logError, roundMoney, recordLog } from '../config/database.js';
import { requireAuth, requireAdmin, createSession } from '../middleware/auth.js';

const router = Router();

// POST /api/setup/complete — first-run setup wizard
router.post('/setup/complete', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    if (existing > 0) {
      return res.status(400).json({ error: 'Setup sudah selesai' });
    }

    const {
      admin_name, admin_username, admin_password,
      store_name, store_owner_name, store_phone, store_address,
      cash_opening_balance, kas_only,
    } = req.body;

    const name = (admin_name || '').trim();
    const username = (admin_username || '').trim();
    if (!name || username.length < 3 || !admin_password || admin_password.length < 8) {
      return res.status(400).json({ error: 'Nama admin (min 3 karakter), username, dan password (min 8 karakter) wajib diisi' });
    }

    const passwordHash = bcrypt.hashSync(admin_password, 10);
    const now = new Date().toISOString();
    const isKasOnly = kas_only === true;

    const result = db.transaction(() => {
      // Create admin user
      const userResult = db.prepare(
        'INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
      ).run(name, username, passwordHash, 'admin', now, now);

      // Save store settings
      const upsert = db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);

      if (store_name) upsert.run('store_name', store_name.trim(), now);
      if (store_owner_name) upsert.run('store_owner_name', store_owner_name.trim(), now);
      if (store_phone) upsert.run('store_phone', store_phone.trim(), now);
      if (store_address) upsert.run('store_address', store_address.trim(), now);

      // Cash opening balance
      const cashOpening = roundMoney((cash_opening_balance || 0));
      if (cashOpening > 0) {
        const cashAcct = db.prepare("SELECT id FROM accounts WHERE code = 'cash' LIMIT 1").get();
        if (cashAcct) {
          db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?')
            .run(cashOpening, now, cashAcct.id);
          const newBal = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(cashAcct.id).balance;
          db.prepare(
            'INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(cashAcct.id, 'opening', cashOpening, newBal, 'Saldo awal dari Setup Wizard', now);
        }
      }

      return userResult.lastInsertRowid;
    })();

    const user = db.prepare('SELECT id, name, username, role FROM users WHERE id = ?').get(result);
    const token = createSession(user);

    recordLog(db, 'INFO', 'setup', 'Setup wizard selesai');

    res.json({
      ok: true,
      token,
      user,
      cash_opening_balance: roundMoney(cash_opening_balance || 0),
      kas_only: isKasOnly,
    });
  } catch (err) {
    logError(getDb(), 'setup', `Setup complete error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seed/system — seed account templates
router.post('/seed/system', (req, res) => {
  try {
    const db = getDb();

    // Can be called without auth if no users yet (first-run)
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    if (userCount > 0) {
      // Need admin
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const { getSession } = require('../middleware/auth.js');
      const session = getSession(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
      }
    }

    const now = new Date().toISOString();
    let stats = { accounts: 0 };

    const templates = [
      { code: 'bca', name: 'BCA', icon: 'bank', color: '#003399' },
      { code: 'bri', name: 'BRI', icon: 'bank', color: '#00529c' },
      { code: 'mandiri', name: 'Mandiri', icon: 'bank', color: '#003366' },
      { code: 'bni', name: 'BNI', icon: 'bank', color: '#f05a22' },
      { code: 'bsi', name: 'BSI', icon: 'bank', color: '#00a170' },
      { code: 'permata', name: 'Permata', icon: 'bank', color: '#005baa' },
      { code: 'danamon', name: 'Danamon', icon: 'bank', color: '#fdd835' },
      { code: 'cimb', name: 'CIMB Niaga', icon: 'bank', color: '#7B1FA2' },
      { code: 'btn', name: 'BTN', icon: 'bank', color: '#f57c00' },
      { code: 'muamalat', name: 'Bank Muamalat', icon: 'bank', color: '#00695c' },
      { code: 'gopay', name: 'GoPay', icon: 'wallet', color: '#00aed6' },
      { code: 'ovo', name: 'OVO', icon: 'wallet', color: '#4c2a86' },
      { code: 'dana', name: 'DANA', icon: 'wallet', color: '#118eea' },
      { code: 'shopeepay', name: 'ShopeePay', icon: 'wallet', color: '#ee4d2d' },
      { code: 'qris', name: 'QRIS', icon: 'qr', color: '#e91e63' },
    ];

    db.transaction(() => {
      const insert = db.prepare(
        'INSERT OR IGNORE INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, 1, ?, ?)'
      );
      for (const t of templates) {
        insert.run(t.code, t.name, t.icon, t.color, now, now);
      }
    })();

    const accounts = db.prepare("SELECT * FROM accounts WHERE code != 'cash' ORDER BY name").all();
    stats.accounts = accounts.length;

    res.json({ message: 'System templates berhasil di-seed', stats });
  } catch (err) {
    logError(getDb(), 'seed', `Seed system error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/setup/templates — get available account templates
router.get('/setup/templates', (req, res) => {
  try {
    const db = getDb();
    const templates = db.prepare("SELECT id, code, name, icon, color, is_active, balance FROM accounts ORDER BY created_at ASC").all();
    const cashAccount = templates.find(t => t.code === 'cash') || null;
    res.json({ templates, cash_account: cashAccount });
  } catch (err) {
    logError(getDb(), 'seed', `Get templates error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seed/demo — seed demo data (dev only)
router.post('/seed/demo', (req, res) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    let stats = { products: 0, categories: 0 };

    db.transaction(() => {
      // Seed categories
      const categories = [
        { name: 'Makanan', icon: 'food', color: '#ff5722' },
        { name: 'Minuman', icon: 'drink', color: '#2196f3' },
        { name: 'Snack', icon: 'snack', color: '#4caf50' },
        { name: 'Sembako', icon: 'grocery', color: '#ff9800' },
        { name: 'Lainnya', icon: 'box', color: '#9e9e9e' },
      ];

      const insertCat = db.prepare(
        'INSERT OR IGNORE INTO product_categories (name, icon, color, is_active, created_at) VALUES (?, ?, ?, 1, ?)'
      );
      for (const cat of categories) {
        insertCat.run(cat.name, cat.icon, cat.color, now);
      }
      stats.categories = db.prepare('SELECT COUNT(*) as cnt FROM product_categories').get().cnt;

      // Seed sample products
      const products = [
        { name: 'Nasi Goreng', category: 'Makanan', buy: 8000, sell: 15000, stock: 20 },
        { name: 'Mie Goreng', category: 'Makanan', buy: 7000, sell: 12000, stock: 15 },
        { name: 'Es Teh Manis', category: 'Minuman', buy: 2000, sell: 5000, stock: 50 },
        { name: 'Kopi Hitam', category: 'Minuman', buy: 3000, sell: 7000, stock: 30 },
        { name: 'Kerupuk', category: 'Snack', buy: 1000, sell: 3000, stock: 100 },
        { name: 'Beras 5kg', category: 'Sembako', buy: 55000, sell: 65000, stock: 10 },
        { name: 'Minyak 1L', category: 'Sembako', buy: 15000, sell: 18000, stock: 8 },
        { name: 'Gula 1kg', category: 'Sembako', buy: 14000, sell: 17000, stock: 12 },
      ];

      const insertProd = db.prepare(
        'INSERT OR IGNORE INTO products (name, barcode, category_id, buy_price, sell_price, stock, min_stock, unit, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
      );

      for (const p of products) {
        const cat = db.prepare("SELECT id FROM product_categories WHERE name = ?").get(p.category);
        if (cat) {
          insertProd.run(p.name, null, cat.id, p.buy, p.sell, p.stock, 5, 'pcs', now, now);
        }
      }
      stats.products = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
    })();

    res.json({ message: 'Demo data berhasil di-seed', stats });
  } catch (err) {
    logError(getDb(), 'seed', `Seed demo error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seed/clear — clear demo data
router.post('/seed/clear', (req, res) => {
  try {
    const db = getDb();

    db.transaction(() => {
      db.prepare('DELETE FROM transaction_items').run();
      db.prepare('DELETE FROM transactions').run();
      db.prepare('DELETE FROM debt_payments').run();
      db.prepare('DELETE FROM debts').run();
      db.prepare('DELETE FROM account_mutations').run();
      db.prepare("UPDATE accounts SET balance = 0 WHERE code != 'cash'").run();
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM product_categories').run();
      db.prepare('DELETE FROM agent_fee_tiers').run();
      db.prepare("DELETE FROM agent_service_templates WHERE name NOT IN ('Tarik Tunai', 'Setor Tunai', 'Transfer', 'Payment/Topup')").run();
      db.prepare("DELETE FROM app_logs").run();
    })();

    recordLog(db, 'INFO', 'seed', 'Demo data dihapus');
    res.json({ message: 'Demo data berhasil dihapus' });
  } catch (err) {
    logError(getDb(), 'seed', `Clear demo error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
