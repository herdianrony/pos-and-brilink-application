import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { mkdirSync } from "fs";
import { dirname } from "path";

const databaseUrl = process.env.DATABASE_URL || "file:./data.db";

// ── Pastikan direktori database ada (untuk file: URLs) ──
// Jika tidak, libsql akan throw saat createClient.
function ensureDbDir(url: string) {
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length);
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // ignore — mungkin sudah ada atau tidak punya akses
  }
}

ensureDbDir(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsLibsqlClient?: ReturnType<typeof createClient>;
  __arenaNextJsUsersTableReady?: boolean;
  __arenaNextJsDbReady?: Promise<void>;
};

const client =
  globalForDb.__arenaNextJsLibsqlClient ??
  createClient({
    url: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsLibsqlClient = client;
}

// ── Pastikan tabel `users` ada (kompatibel dengan schema.ts) ──
// Menggunakan CREATE TABLE IF NOT EXISTS agar aman dipanggil berulang.
// Di-fire-and-forget; query pertama yang butuh tabel users akan menunggu
// secara alami karena libsql mengeksekusi query secara serial.
if (!globalForDb.__arenaNextJsUsersTableReady) {
  // Daftar CREATE TABLE / INDEX untuk semua tabel aplikasi.
  // Dibungkus IF NOT EXISTS agar aman dipanggil berulang (idempotent).
  const bootstrapStatements = [
    // users (tabel autentikasi)
    `CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text(100) NOT NULL,
      \`username\` text(50) NOT NULL,
      \`password_hash\` text NOT NULL,
      \`role\` text(20) DEFAULT 'kasir' NOT NULL,
      \`is_active\` integer DEFAULT true NOT NULL,
      \`last_login_at\` integer,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      \`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS \`users_username_unique\` ON \`users\` (\`username\`)`,
    // Tabel aplikasi (dari drizzle migration 0000)
    `CREATE TABLE IF NOT EXISTS \`categories\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text(100) NOT NULL,
      \`icon\` text(50) DEFAULT 'package',
      \`color\` text(20) DEFAULT '#6366f1',
      \`is_active\` integer DEFAULT true NOT NULL,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text(255) NOT NULL,
      \`barcode\` text(50),
      \`category_id\` integer,
      \`buy_price\` real DEFAULT 0 NOT NULL,
      \`sell_price\` real NOT NULL,
      \`stock\` integer DEFAULT 0 NOT NULL,
      \`min_stock\` integer DEFAULT 5 NOT NULL,
      \`unit\` text(20) DEFAULT 'pcs',
      \`image\` text,
      \`is_active\` integer DEFAULT true NOT NULL,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      \`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS \`service_categories\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`code\` text(30) NOT NULL,
      \`name\` text(100) NOT NULL,
      \`icon\` text(50) DEFAULT 'credit-card',
      \`color\` text(20) DEFAULT '#0ea5e9',
      \`sort_order\` integer DEFAULT 0 NOT NULL,
      \`is_active\` integer DEFAULT true NOT NULL,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS \`service_categories_code_unique\` ON \`service_categories\` (\`code\`)`,
    `CREATE TABLE IF NOT EXISTS \`brilink_services\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`code\` text(30) NOT NULL,
      \`name\` text(100) NOT NULL,
      \`category_id\` integer,
      \`category_code\` text(30),
      \`icon\` text(50) DEFAULT 'credit-card',
      \`admin_fee\` real DEFAULT 0 NOT NULL,
      \`agent_fee\` real DEFAULT 0 NOT NULL,
      \`use_tiered_fee\` integer DEFAULT false NOT NULL,
      \`cash_effect\` text(10) DEFAULT 'in' NOT NULL,
      \`bank_effect\` text(10) DEFAULT 'out' NOT NULL,
      \`flow_type\` text(30) DEFAULT 'payment' NOT NULL,
      \`default_fee_method\` text(20) DEFAULT 'cash' NOT NULL,
      \`description\` text,
      \`is_active\` integer DEFAULT true NOT NULL,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      FOREIGN KEY (\`category_id\`) REFERENCES \`service_categories\`(\`id\`) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS \`brilink_services_code_unique\` ON \`brilink_services\` (\`code\`)`,
    `CREATE TABLE IF NOT EXISTS \`fee_tiers\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`service_id\` integer NOT NULL,
      \`min_amount\` real NOT NULL,
      \`max_amount\` real,
      \`admin_fee\` real NOT NULL,
      \`agent_fee\` real NOT NULL,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      FOREIGN KEY (\`service_id\`) REFERENCES \`brilink_services\`(\`id\`) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS \`transactions\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`invoice_no\` text(50) NOT NULL,
      \`type\` text(20) NOT NULL,
      \`sub_type\` text(50),
      \`customer_name\` text(255),
      \`customer_phone\` text(50),
      \`total_amount\` real NOT NULL,
      \`admin_fee\` real DEFAULT 0,
      \`profit\` real DEFAULT 0,
      \`payment_method\` text(30) DEFAULT 'cash',
      \`notes\` text,
      \`flow_type\` text(30),
      \`fee_method\` text(20),
      \`cash_received\` real DEFAULT 0,
      \`cash_dispensed\` real DEFAULT 0,
      \`settlement_account_id\` integer,
      \`reference_no\` text(100),
      \`status\` text(20) DEFAULT 'completed' NOT NULL,
      \`confirmed_at\` integer,
      \`confirmed_by_user_id\` integer,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS \`transaction_items\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`transaction_id\` integer NOT NULL,
      \`product_id\` integer,
      \`product_name\` text(255) NOT NULL,
      \`quantity\` integer NOT NULL,
      \`unit_price\` real NOT NULL,
      \`subtotal\` real NOT NULL,
      FOREIGN KEY (\`transaction_id\`) REFERENCES \`transactions\`(\`id\`) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS \`transaction_denominations\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`transaction_id\` integer NOT NULL,
      \`denomination\` integer NOT NULL,
      \`count\` integer NOT NULL,
      \`subtotal\` integer NOT NULL,
      FOREIGN KEY (\`transaction_id\`) REFERENCES \`transactions\`(\`id\`) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS \`accounts\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`code\` text(20) NOT NULL,
      \`name\` text(100) NOT NULL,
      \`icon\` text(50) DEFAULT 'wallet',
      \`color\` text(20) DEFAULT '#00875A',
      \`balance\` real DEFAULT 0 NOT NULL,
      \`min_balance\` real DEFAULT 100000,
      \`is_active\` integer DEFAULT true NOT NULL,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      \`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS \`accounts_code_unique\` ON \`accounts\` (\`code\`)`,
    `CREATE TABLE IF NOT EXISTS \`account_mutations\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`account_id\` integer NOT NULL,
      \`type\` text(30) NOT NULL,
      \`amount\` real NOT NULL,
      \`balance_after\` real NOT NULL,
      \`reference_id\` integer,
      \`notes\` text,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      FOREIGN KEY (\`account_id\`) REFERENCES \`accounts\`(\`id\`) ON UPDATE no action ON DELETE no action
    )`,
    `CREATE TABLE IF NOT EXISTS \`settings\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`key\` text(100) NOT NULL,
      \`value\` text NOT NULL,
      \`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS \`settings_key_unique\` ON \`settings\` (\`key\`)`,
    `CREATE TABLE IF NOT EXISTS \`cash_balance\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`type\` text(20) NOT NULL,
      \`amount\` real NOT NULL,
      \`balance_after\` real NOT NULL,
      \`notes\` text,
      \`reference_id\` integer,
      \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    )`,
  ];

  // ── Migration: ALTER TABLE untuk kolom baru (S-04, S-05, seed-redesign) ──
  // ALTER TABLE ADD COLUMN di SQLite tidak error jika kolom sudah ada?
  // Tidak — SQLite akan throw "duplicate column name". Jadi kita catch errornya.
  const migrationStatements = [
    // S-04: brilink_services.flow_type, default_fee_method
    `ALTER TABLE \`brilink_services\` ADD COLUMN \`flow_type\` text(30) DEFAULT 'payment' NOT NULL`,
    `ALTER TABLE \`brilink_services\` ADD COLUMN \`default_fee_method\` text(20) DEFAULT 'cash' NOT NULL`,
    // S-05: transactions audit fields
    `ALTER TABLE \`transactions\` ADD COLUMN \`flow_type\` text(30)`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`fee_method\` text(20)`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`cash_received\` real DEFAULT 0`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`cash_dispensed\` real DEFAULT 0`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`settlement_account_id\` integer`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`reference_no\` text(100)`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`status\` text(20) DEFAULT 'completed' NOT NULL`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`confirmed_at\` integer`,
    `ALTER TABLE \`transactions\` ADD COLUMN \`confirmed_by_user_id\` integer`,
    // Seed redesign: code + category_code columns
    `ALTER TABLE \`service_categories\` ADD COLUMN \`code\` text(30)`,
    `ALTER TABLE \`brilink_services\` ADD COLUMN \`code\` text(30)`,
    `ALTER TABLE \`brilink_services\` ADD COLUMN \`category_code\` text(30)`,
  ];

  // Eksekusi semua statement secara berurutan
  const runBootstrap = async () => {
    for (const stmt of bootstrapStatements) {
      try {
        await client.execute(stmt);
      } catch (err) {
        // Bukan fatal — mungkin tabel sudah ada atau sedang dibuat paralel
        console.error("Bootstrap SQL error:", stmt.slice(0, 60), err);
      }
    }
    // S-04/S-05: Run migrations (ALTER TABLE for new columns)
    // Error "duplicate column name" diabaikan karena kolom mungkin sudah ada
    for (const stmt of migrationStatements) {
      try {
        await client.execute(stmt);
      } catch (err: any) {
        // "duplicate column name" expected jika kolom sudah ada — bukan error
        if (!String(err?.message || "").includes("duplicate column name")) {
          console.error("Migration SQL error:", stmt.slice(0, 80), err);
        }
      }
    }
    globalForDb.__arenaNextJsUsersTableReady = true;
  };
  globalForDb.__arenaNextJsDbReady = runBootstrap();
}

// Promise yang resolve ketika semua tabel siap. Await ini sebelum query
// pertama di endpoint kritis (seed, login) untuk menghindari race condition.
export const dbReady: Promise<void> = (
  globalForDb as typeof globalThis & { __arenaNextJsDbReady?: Promise<void> }
).__arenaNextJsDbReady ?? Promise.resolve();

export const db = drizzle(client);
export { client };

// ── Atomic transaction helper (F-03 fix) ─────────
// Menggunakan Drizzle's db.transaction() yang memakai libSQL interactive
// transaction (BEGIN/COMMIT/ROLLBACK). Jika fn throw, ROLLBACK dijalankan
// otomatis dan tidak ada perubahan yang dipersist.
//
// Catatan: callback menerima `tx` yang berbeda dari `db` global.
// Semua operasi DB dalam fn HARUS pakai `tx`, BUKAN `db`.
export async function runTransaction<T>(
  fn: (tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return await db.transaction(fn as any, {
    behavior: "deferred",
  });
}

// ── Batch atomic write ───────────────────────────
// Gunakan libSQL client.batch() untuk atomic multi-statement writes.
// Semua statement dieksekusi dalam satu transaction — jika satu gagal,
// semua di-rollback.
export async function batchAtomic(
  statements: Array<{ sql: string; args?: any[] }>
): Promise<void> {
  await client.batch(
    statements.map(s => ({ sql: s.sql, args: s.args || [], mode: "write" as const }))
  );
}

// ── Safe numeric parser (F-07) ───────────────────
// Parse angka dengan validasi finite & non-negative.
// Returns 0 bila input invalid (NaN, Infinity, negative untuk allowNegative=false).
export function parseSafeNumber(
  input: unknown,
  opts: { allowNegative?: boolean; min?: number; max?: number; default?: number } = {}
): number {
  const { allowNegative = false, min, max, default: def = 0 } = opts;
  const n = typeof input === "number" ? input : parseFloat(String(input ?? ""));
  if (!Number.isFinite(n)) return def;
  if (!allowNegative && n < 0) return def;
  if (min !== undefined && n < min) return def;
  if (max !== undefined && n > max) return def;
  return n;
}