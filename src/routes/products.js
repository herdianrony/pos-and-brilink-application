/**
 * Product & Category routes — CRUD, image handling, restock.
 */

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, logError, roundMoney, validateMoney, getAppDir, recordLog } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const IMAGE_DIR = () => path.join(getAppDir(), 'product-images');

function ensureImageDir() {
  const dir = IMAGE_DIR();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Save base64 data URL to file, return relative path. */
function saveImage(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;

  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(ensureImageDir(), filename);
  fs.writeFileSync(filePath, buffer);
  return filename;
}

// ── Categories ─────────────────────────────────────────────────

// GET /api/categories
router.get('/categories', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM product_categories WHERE is_active = 1 ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'products', `List categories error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post('/categories', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { name, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(
      'INSERT INTO product_categories (name, icon, color, is_active, created_at) VALUES (?, ?, ?, 1, ?)'
    ).run(name, icon || null, color || null, now);

    const category = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(result.lastInsertRowid);
    recordLog(db, 'INFO', 'products', `Kategori dibuat: ${name}`);
    res.json(category);
  } catch (err) {
    logError(getDb(), 'products', `Create category error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories
router.put('/categories', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id, name, icon, color } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'ID dan nama kategori wajib diisi' });
    }

    const category = db.prepare('SELECT * FROM product_categories WHERE id = ? AND is_active = 1').get(Number(id));
    if (!category) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    db.prepare(
      'UPDATE product_categories SET name = ?, icon = ?, color = ? WHERE id = ?'
    ).run(name, icon !== undefined ? icon : category.icon, color !== undefined ? color : category.color, id);

    const updated = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id);
    recordLog(db, 'INFO', 'products', `Kategori diupdate: ${name}`);
    res.json(updated);
  } catch (err) {
    logError(getDb(), 'products', `Update category error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/categories/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    const category = db.prepare('SELECT * FROM product_categories WHERE id = ? AND is_active = 1').get(id);
    if (!category) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    db.prepare('UPDATE product_categories SET is_active = 0 WHERE id = ?').run(id);
    recordLog(db, 'WARN', 'products', `Kategori dinonaktifkan: ${category.name}`);
    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'products', `Deactivate category error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ── Products ───────────────────────────────────────────────────

// GET /api/products
router.get('/products', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { search, category_id } = req.query;

    let query = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (search) { query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (category_id) { query += ' AND p.category_id = ?'; params.push(Number(category_id)); }

    query += ' ORDER BY p.name';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    logError(getDb(), 'products', `List products error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/products', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { name, barcode, category_id, buy_price, sell_price, stock, min_stock, unit, image_data_url } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama produk wajib diisi' });
    }

    const bp = roundMoney(buy_price || 0);
    const sp = roundMoney(sell_price || 0);
    const st = Number(stock) || 0;
    const ms = Number(min_stock) || 5;
    const now = new Date().toISOString();

    let imagePath = null;
    if (image_data_url) {
      imagePath = saveImage(image_data_url);
    }

    const result = db.prepare(
      'INSERT INTO products (name, barcode, category_id, buy_price, sell_price, stock, min_stock, unit, is_active, created_at, updated_at, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)'
    ).run(name, barcode || null, category_id || null, bp, sp, st, ms, unit || 'pcs', now, now, imagePath);

    const product = db.prepare(`
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    recordLog(db, 'INFO', 'products', `Produk dibuat: ${name}`);
    res.json(product);
  } catch (err) {
    logError(getDb(), 'products', `Create product error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products
router.put('/products', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id, name, barcode, category_id, buy_price, sell_price, min_stock, unit, image_data_url, remove_image } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID produk wajib diisi' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(Number(id));
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const now = new Date().toISOString();
    let imagePath = product.image_path;

    // Handle image changes
    if (remove_image) {
      if (imagePath) {
        try { fs.unlinkSync(path.join(IMAGE_DIR(), imagePath)); } catch { /* ignore */ }
      }
      imagePath = null;
    } else if (image_data_url) {
      if (imagePath) {
        try { fs.unlinkSync(path.join(IMAGE_DIR(), imagePath)); } catch { /* ignore */ }
      }
      imagePath = saveImage(image_data_url);
    }

    const bp = buy_price !== undefined ? roundMoney(buy_price) : product.buy_price;
    const sp = sell_price !== undefined ? roundMoney(sell_price) : product.sell_price;
    const ms = min_stock !== undefined ? Number(min_stock) : product.min_stock;

    db.prepare(
      'UPDATE products SET name = ?, barcode = ?, category_id = ?, buy_price = ?, sell_price = ?, min_stock = ?, unit = ?, image_path = ?, updated_at = ? WHERE id = ?'
    ).run(
      name || product.name,
      barcode !== undefined ? barcode : product.barcode,
      category_id !== undefined ? category_id : product.category_id,
      bp, sp, ms,
      unit !== undefined ? unit : product.unit,
      imagePath,
      now, id
    );

    const updated = db.prepare(`
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.id = ?
    `).get(id);

    recordLog(db, 'INFO', 'products', `Produk diupdate: ${updated.name}`);
    res.json(updated);
  } catch (err) {
    logError(getDb(), 'products', `Update product error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/products/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    db.prepare('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    recordLog(db, 'WARN', 'products', `Produk dinonaktifkan: ${product.name}`);
    res.json({ ok: true });
  } catch (err) {
    logError(getDb(), 'products', `Deactivate product error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id/image
router.get('/products/:id/image', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);

    const product = db.prepare('SELECT image_path FROM products WHERE id = ? AND is_active = 1').get(id);
    if (!product || !product.image_path) {
      return res.status(404).json({ error: 'Gambar tidak ditemukan' });
    }

    const filePath = path.join(IMAGE_DIR(), product.image_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File gambar tidak ditemukan' });
    }

    const ext = path.extname(product.image_path).slice(1);
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    const buffer = fs.readFileSync(filePath);
    const dataUrl = `data:image/${mime};base64,${buffer.toString('base64')}`;

    res.json({ data_url: dataUrl });
  } catch (err) {
    logError(getDb(), 'products', `Get product image error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/restock
router.post('/products/restock', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { product_id, quantity, notes, cost_price } = req.body;

    if (!product_id || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'product_id dan quantity (positif) wajib diisi' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(Number(product_id));
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const qty = Number(quantity);
    const now = new Date().toISOString();

    const doRestock = db.transaction(() => {
      const newStock = product.stock + qty;

      // Update buy_price if cost_price provided
      if (cost_price !== undefined && cost_price !== null) {
        db.prepare(
          'UPDATE products SET stock = ?, buy_price = ?, updated_at = ? WHERE id = ?'
        ).run(newStock, roundMoney(cost_price), now, product.id);
      } else {
        db.prepare(
          'UPDATE products SET stock = ?, updated_at = ? WHERE id = ?'
        ).run(newStock, now, product.id);
      }

      return newStock;
    });

    const newStock = doRestock();
    recordLog(db, 'INFO', 'products', `Restok: ${product.name} +${qty} -> ${newStock}`);

    const updated = db.prepare(`
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.id = ?
    `).get(product.id);
    res.json(updated);
  } catch (err) {
    logError(getDb(), 'products', `Restock error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
