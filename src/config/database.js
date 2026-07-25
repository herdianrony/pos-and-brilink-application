/**
 * Database module — better-sqlite3 singleton with migrations & seed defaults.
 *
 * All tables mirror the original Rust schema exactly so existing databases
 * continue to work without any data migration.
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const APP_DIR = path.join(os.homedir(), '.pos-brilink');
const DB_DIR = path.join(APP_DIR, 'data');
const DB_PATH = path.join(DB_DIR, 'catatagen.db');

let _db = null;

/** Get or create the singleton database connection. */
export function getDb() {
  if (!_db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    migrate(_db);
    seedDefaults(_db);
  }
  return _db;
}

// ── Schema ─────────────────────────────────────────────────────

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'kasir',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      balance REAL NOT NULL DEFAULT 0,
      min_balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT,
      category_id INTEGER,
      buy_price REAL NOT NULL DEFAULT 0,
      sell_price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      unit TEXT DEFAULT 'pcs',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(category_id) REFERENCES product_categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS account_mutations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      notes TEXT,
      reference_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_service_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      default_fee REAL NOT NULL DEFAULT 0,
      provider_cost REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_fee_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      min_amount REAL NOT NULL DEFAULT 0,
      max_amount REAL,
      fee REAL NOT NULL DEFAULT 0,
      provider_cost REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(service_id) REFERENCES agent_service_templates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      customer_name TEXT,
      total_amount REAL NOT NULL,
      profit REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT,
      created_at TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT,
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(debt_id) REFERENCES debts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // ALTER TABLE additions (idempotent — ignore if column already exists)
  const alterColumns = [
    'ALTER TABLE products ADD COLUMN image_path TEXT',
    'ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)',
  ];
  for (const sql of alterColumns) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  // Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_account_mutations_account_created ON account_mutations(account_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id)',
    'CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at)',
  ];
  for (const sql of indexes) {
    db.exec(sql);
  }
}

// ── Seed defaults ──────────────────────────────────────────────

function seedDefaults(db) {
  const now = new Date().toISOString();
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
  );
  const insertAccount = db.prepare(
    'INSERT OR IGNORE INTO accounts (code, name, icon, color, balance, min_balance, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, 1, ?, ?)'
  );
  const insertService = db.prepare(
    'INSERT OR IGNORE INTO agent_service_templates (name, category, default_fee, provider_cost, is_active, created_at, updated_at) VALUES (?, ?, ?, 0, 1, ?, ?)'
  );

  const tx = db.transaction(() => {
    insertSetting.run('app_name', 'CatatAgen Local', now);
    insertAccount.run('cash', 'Kas Tunai', 'banknote', '#22c55e', now, now);
    for (const [name, category, fee] of [
      ['Tarik Tunai', 'Tunai', 5000],
      ['Setor Tunai', 'Tunai', 5000],
      ['Transfer', 'Transfer', 5000],
      ['Payment/Topup', 'Payment', 2500],
    ]) {
      insertService.run(name, category, fee, now, now);
    }
  });
  tx();
}

// ── Logging ───────────────────────────────────────────────────

/** Record an entry in app_logs table. */
export function recordLog(db, level, source, message) {
  try {
    db.prepare(
      'INSERT INTO app_logs (level, source, message, created_at) VALUES (?, ?, ?, ?)'
    ).run(level, source, message, new Date().toISOString());
  } catch { /* ignore log failures */ }
}

/** Convenience: log an ERROR to app_logs. */
export function logError(db, source, message) {
  recordLog(db, 'ERROR', source, message);
}

// ── Helpers ────────────────────────────────────────────────────

/** Get database path (for display). */
export function getDbPath() {
  return DB_PATH;
}

/** Get app data directory. */
export function getAppDir() {
  return APP_DIR;
}

/** Round money to nearest integer (Rupiah has no decimals). */
export function roundMoney(value) {
  return Math.round(value);
}

/** Generate a unique invoice number. */
export function generateInvoiceNo(db, prefix = 'TRX') {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM transactions WHERE created_at LIKE ?"
  ).get(`${dateStr}%`);
  const seq = String((row?.cnt || 0) + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${seq}`;
}

/** Normalize an account code (lowercase, alphanumeric, no leading/trailing underscores). */
export function normalizeCode(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Validate password strength. */
export function validatePassword(password) {
  if (!password || password.length < 6) {
    throw new Error('Password minimal 6 karakter');
  }
}

/** Validate a money value (positive number). */
export function validateMoney(value, fieldName = 'Nilai') {
  const n = Number(value);
  if (isNaN(n) || n < 0) {
    throw new Error(`${fieldName} harus berupa angka positif`);
  }
  return n;
}
