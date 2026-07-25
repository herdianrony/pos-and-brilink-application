/**
 * Transaction routes — list, detail, actions (void/reverse/complete), checkout, agent.
 */

import { Router } from 'express';
import { getDb, logError, roundMoney, validateMoney, generateInvoiceNo, recordLog } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/transactions
router.get('/transactions', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const { transaction_type, start_date, end_date } = req.query;

    let query = `
      SELECT t.*, u.name as user_name
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE 1=1
    `;
    const params = [];

    if (transaction_type) { query += ' AND t.type = ?'; params.push(transaction_type); }
    if (start_date) { query += ' AND t.created_at >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND t.created_at <= ?'; params.push(end_date); }

    query += ' ORDER BY t.created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'transactions', `List transactions error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:id
router.get('/transactions/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const row = db.prepare(`
      SELECT t.*, u.name as user_name
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.id = ?
    `).get(id);
    if (!row) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    res.json(row);
  } catch (err) {
    logError(getDb(), 'transactions', `Get transaction error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:id/items
router.get('/transactions/:id/items', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const rows = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id);
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'transactions', `Get transaction items error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/:id/action — void, reverse, complete
router.post('/transactions/:id/action', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { action } = req.body;

    if (!['void', 'reverse', 'complete'].includes(action)) {
      return res.status(400).json({ error: 'Action harus void, reverse, atau complete' });
    }

    const trx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!trx) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    if (trx.status === 'voided') {
      return res.status(400).json({ error: 'Transaksi sudah dibatalkan' });
    }

    const now = new Date().toISOString();

    if (action === 'complete') {
      db.prepare('UPDATE transactions SET status = ?, notes = COALESCE(?, notes) WHERE id = ?')
        .run('completed', req.body.notes || null, id);
      recordLog(db, 'INFO', 'transactions', `Transaksi ${trx.invoice_no} diselesaikan`);
      const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
      return res.json(updated);
    }

    // void or reverse
    const doVoid = db.transaction(() => {
      // Get items with product info
      const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id);

      // Restore stock for product items
      for (const item of items) {
        if (item.product_id) {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
            .run(item.quantity, item.product_id);
        }
      }

      // Reverse account mutations for this transaction
      const mutations = db.prepare(
        'SELECT * FROM account_mutations WHERE reference_id = ?'
      ).all(id);

      for (const mut of mutations) {
        const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(mut.account_id);
        if (account) {
          let newBalance;
          if (mut.type === 'in') {
            newBalance = roundMoney(account.balance - mut.amount);
          } else {
            newBalance = roundMoney(account.balance + mut.amount);
          }
          db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?')
            .run(newBalance, now, account.id);

          db.prepare(
            'INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(
            account.id,
            mut.type === 'in' ? 'out' : 'in',
            mut.amount,
            newBalance,
            `Pembatalan ${trx.invoice_no}`,
            now
          );
        }
      }

      // Update transaction status
      db.prepare('UPDATE transactions SET status = ?, notes = COALESCE(?, notes) WHERE id = ?')
        .run('voided', req.body.notes || null, id);
    });

    doVoid();
    recordLog(db, 'WARN', 'transactions', `Transaksi ${trx.invoice_no} dibatalkan (${action}) oleh ${req.user.name}`);

    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    logError(getDb(), 'transactions', `Transaction action error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/checkout — POS checkout
router.post('/transactions/checkout', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const {
      items,
      customer_name,
      payment_method,
      discount_amount,
      settlement_account_id,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items wajib diisi' });
    }

    if (!['cash', 'transfer', 'qris'].includes(payment_method || 'cash')) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid' });
    }

    const pm = payment_method || 'cash';
    const discount = roundMoney(discount_amount || 0);
    const now = new Date().toISOString();
    const invoiceNo = generateInvoiceNo(db, 'TRX');

    let settlementAccountId = null;
    if (settlement_account_id) {
      const acc = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(Number(settlement_account_id));
      if (!acc) {
        return res.status(400).json({ error: 'Akun settlement tidak ditemukan' });
      }
      settlementAccountId = acc.id;
    }

    const doCheckout = db.transaction(() => {
      let totalAmount = 0;
      let totalProfit = 0;
      const itemRows = [];

      // Create transaction
      const trxResult = db.prepare(
        'INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(invoiceNo, 'pos', customer_name || null, 0, 0, pm, 'completed', notes || null, now, req.user.userId);
      const trxId = trxResult.lastInsertRowid;

      for (const item of items) {
        if (item.product_id) {
          // Product item
          const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(Number(item.product_id));
          if (!product) {
            throw new Error(`Produk tidak ditemukan: ${item.product_id}`);
          }

          const qty = Number(item.quantity) || 1;
          if (product.stock < qty) {
            throw new Error(`Stok ${product.name} tidak mencukupi (sisa: ${product.stock})`);
          }

          const unitPrice = roundMoney(item.unit_price || product.sell_price);
          const subtotal = roundMoney(unitPrice * qty);
          const itemProfit = roundMoney((product.sell_price - product.buy_price) * qty);

          // Deduct stock
          db.prepare('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?')
            .run(qty, now, product.id);

          db.prepare(
            'INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(trxId, product.id, product.name, qty, unitPrice, subtotal);

          totalAmount += subtotal;
          totalProfit += itemProfit;
          itemRows.push({ product_id: product.id, product_name: product.name, quantity: qty, unit_price: unitPrice, subtotal, profit: itemProfit });
        } else if (item.service_id) {
          // Agent service item
          const service = db.prepare('SELECT * FROM agent_service_templates WHERE id = ? AND is_active = 1').get(Number(item.service_id));
          if (!service) {
            throw new Error(`Layanan tidak ditemukan: ${item.service_id}`);
          }

          const qty = Number(item.quantity) || 1;
          const fee = roundMoney(item.fee || service.default_fee);
          const providerCost = roundMoney(item.provider_cost || service.provider_cost);
          const subtotal = roundMoney(fee * qty);
          const itemProfit = roundMoney((fee - providerCost) * qty);

          db.prepare(
            'INSERT INTO transaction_items (transaction_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)'
          ).run(trxId, service.name, qty, fee, subtotal);

          totalAmount += subtotal;
          totalProfit += itemProfit;
          itemRows.push({ service_id: service.id, product_name: service.name, quantity: qty, unit_price: fee, subtotal, profit: itemProfit, provider_cost: providerCost });
        }
      }

      // Apply discount
      totalAmount = roundMoney(totalAmount - discount);
      if (totalAmount < 0) totalAmount = 0;

      // Update transaction totals
      db.prepare('UPDATE transactions SET total_amount = ?, profit = ? WHERE id = ?')
        .run(totalAmount, totalProfit, trxId);

      // Account settlement
      let settlementBalance = null;
      if (settlementAccountId && totalAmount > 0) {
        const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(settlementAccountId);
        const newBalance = roundMoney(account.balance + totalAmount);

        db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?')
          .run(newBalance, now, settlementAccountId);

        db.prepare(
          'INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(settlementAccountId, 'in', totalAmount, newBalance, `Penjualan ${invoiceNo}`, trxId, now);

        settlementBalance = newBalance;
      }

      return { trxId, totalAmount, totalProfit, settlementBalance };
    });

    const result = doCheckout();
    recordLog(db, 'INFO', 'transactions', `Checkout POS: ${invoiceNo} total=${result.totalAmount} profit=${result.totalProfit}`);

    res.json({
      transaction_id: result.trxId,
      invoice_no: invoiceNo,
      total_amount: result.totalAmount,
      profit: result.totalProfit,
      discount_amount: discount,
      settlement_account_id: settlementAccountId,
      settlement_balance: result.settlementBalance,
    });
  } catch (err) {
    logError(getDb(), 'transactions', `Checkout error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/agent — create agent/BRILink transaction
router.post('/transactions/agent', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const {
      service_id,
      customer_name,
      nominal,
      fee,
      provider_cost,
      payment_method,
      cash_effect,
      bank_effect,
      cash_account_id,
      bank_account_id,
      notes,
    } = req.body;

    if (!service_id) {
      return res.status(400).json({ error: 'service_id wajib diisi' });
    }

    const service = db.prepare('SELECT * FROM agent_service_templates WHERE id = ? AND is_active = 1').get(Number(service_id));
    if (!service) {
      return res.status(404).json({ error: 'Layanan tidak ditemukan' });
    }

    const trxNominal = roundMoney(nominal || 0);
    const trxFee = roundMoney(fee !== undefined ? fee : service.default_fee);
    const trxProviderCost = roundMoney(provider_cost !== undefined ? provider_cost : service.provider_cost);
    const trxProfit = roundMoney(trxFee - trxProviderCost);
    const totalAmount = roundMoney(trxNominal + trxFee);
    const pm = payment_method || 'cash';
    const now = new Date().toISOString();
    const invoiceNo = generateInvoiceNo(db, 'AGN');

    const doAgent = db.transaction(() => {
      // Create transaction
      const trxResult = db.prepare(
        'INSERT INTO transactions (invoice_no, type, customer_name, total_amount, profit, payment_method, status, notes, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(invoiceNo, 'brilink', customer_name || null, totalAmount, trxProfit, pm, 'completed', notes || null, now, req.user.userId);
      const trxId = trxResult.lastInsertRowid;

      // Create transaction item
      db.prepare(
        'INSERT INTO transaction_items (transaction_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)'
      ).run(trxId, service.name, 1, trxFee, trxFee);

      let cashBalanceAfter = null;
      let bankBalanceAfter = null;

      // Cash effect: customer pays cash, we disburse cash to customer
      if (cash_effect && cash_account_id) {
        const cashAccount = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(Number(cash_account_id));
        if (cashAccount) {
          // Customer gives us cash for the fee, we give them cash for the nominal
          // Net cash effect: fee (in) - nominal (out) = fee - nominal
          const netCash = roundMoney(trxFee - trxNominal);
          const newBalance = roundMoney(cashAccount.balance + netCash);

          db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?')
            .run(newBalance, now, cashAccount.id);

          db.prepare(
            'INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(cashAccount.id, 'in', Math.abs(netCash), newBalance, `BRILink ${invoiceNo}`, trxId, now);

          if (netCash < 0) {
            db.prepare(
              'INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).run(cashAccount.id, 'out', Math.abs(netCash), newBalance, `BRILink ${invoiceNo} (disbursement)`, trxId, now);
          }

          cashBalanceAfter = newBalance;
        }
      }

      // Bank effect: bank account used for the transaction
      if (bank_effect && bank_account_id) {
        const bankAccount = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(Number(bank_account_id));
        if (bankAccount) {
          const bankAmount = roundMoney(bank_effect);
          const newBalance = roundMoney(bankAccount.balance - bankAmount);

          db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?')
            .run(newBalance, now, bankAccount.id);

          db.prepare(
            'INSERT INTO account_mutations (account_id, type, amount, balance_after, notes, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(bankAccount.id, 'out', bankAmount, newBalance, `BRILink ${invoiceNo} (bank)`, trxId, now);

          bankBalanceAfter = newBalance;
        }
      }

      return { trxId, cashBalanceAfter, bankBalanceAfter };
    });

    const result = doAgent();
    recordLog(db, 'INFO', 'transactions', `Transaksi BRILink: ${invoiceNo} ${service.name} nominal=${trxNominal} fee=${trxFee}`);

    res.json({
      transaction_id: result.trxId,
      invoice_no: invoiceNo,
      total_amount: totalAmount,
      profit: trxProfit,
      cash_balance_after: result.cashBalanceAfter,
      bank_balance_after: result.bankBalanceAfter,
    });
  } catch (err) {
    logError(getDb(), 'transactions', `Agent transaction error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
