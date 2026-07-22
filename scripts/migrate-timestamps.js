/**
 * scripts/migrate-timestamps.js
 *
 * R-05: Migrate existing timestamp values from seconds to milliseconds.
 *
 * Drizzle's `mode: "timestamp"` stored values in seconds (Unix epoch seconds),
 * while the SQL default `julianday('now') * 86400000` stored in milliseconds.
 * After changing schema to `timestamp_ms`, old seconds-based values are
 * read as dates in 1970 January.
 *
 * This script detects values < 100000000000 (before year 2286 in ms = before
 * year 2001 in seconds) and multiplies them by 1000.
 *
 * Usage:
 *   node scripts/migrate-timestamps.js [database-path]
 *
 * If database-path is omitted, uses DATABASE_URL env or default ./data.db
 *
 * IMPORTANT: Always backup your database before running this migration!
 */
const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

async function main() {
  const dbPath = process.argv[2] || process.env.DATABASE_URL?.replace("file:", "") || "./data.db";
  const url = `file:${dbPath}`;

  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exit(1);
  }

  console.log(`[migrate] Database: ${dbPath}`);
  console.log(`[migrate] WARNING: Pastikan Anda sudah backup database ini!`);
  console.log(`[migrate] Press Ctrl+C dalam 3 detik untuk batal...`);
  await new Promise(r => setTimeout(r, 3000));

  const client = createClient({ url });

  // Tables and columns with timestamp fields
  const tables = [
    { table: "users", columns: ["created_at", "updated_at", "last_login_at"] },
    { table: "categories", columns: ["created_at"] },
    { table: "products", columns: ["created_at", "updated_at"] },
    { table: "service_categories", columns: ["created_at"] },
    { table: "brilink_services", columns: ["created_at"] },
    { table: "fee_tiers", columns: ["created_at"] },
    { table: "transactions", columns: ["created_at"] },
    { table: "accounts", columns: ["created_at", "updated_at"] },
    { table: "account_mutations", columns: ["created_at"] },
    { table: "settings", columns: ["updated_at"] },
    { table: "cash_balance", columns: ["created_at"] },
  ];

  let totalMigrated = 0;

  for (const { table, columns } of tables) {
    for (const col of columns) {
      try {
        // Find rows where timestamp is in seconds (< 100000000000 = before 2286 in ms)
        const result = await client.execute({
          sql: `SELECT id, ${col} FROM ${table} WHERE ${col} IS NOT NULL AND ${col} < 100000000000 AND ${col} > 0`,
        });

        if (result.rows.length === 0) continue;

        console.log(`[migrate] ${table}.${col}: ${result.rows.length} rows need migration`);

        for (const row of result.rows) {
          const oldVal = Number(row[col]);
          const newVal = oldVal * 1000;
          await client.execute({
            sql: `UPDATE ${table} SET ${col} = ? WHERE id = ?`,
            args: [newVal, row.id],
          });
          totalMigrated++;
        }
      } catch (err) {
        // Table or column might not exist — skip
        if (!String(err).includes("no such table") && !String(err).includes("no such column")) {
          console.error(`[migrate] Error on ${table}.${col}:`, err.message);
        }
      }
    }
  }

  console.log(`\n[migrate] Done! ${totalMigrated} values migrated from seconds to milliseconds.`);
  console.log("[migrate] Verifikasi tanggal di Dashboard dan Rekening Koran.");
}

main().catch(err => {
  console.error("[migrate] Fatal error:", err);
  process.exit(1);
});
