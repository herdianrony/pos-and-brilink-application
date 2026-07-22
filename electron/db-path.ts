/**
 * electron/db-path.ts
 *
 * Resolve path database SQLite berdasarkan environment:
 * - Development (npm run dev): file:./data.db di root project
 * - Production (Electron packaged): userData/pos-brilink.db
 *   - Windows : %APPDATA%/pos-brilink-pos/data.db
 *   - macOS   : ~/Library/Application Support/pos-brilink-pos/data.db
 *   - Linux   : ~/.config/pos-brilink-pos/data.db
 *
 * Path userData persisten antar update aplikasi, sehingga data transaksi
 * tidak hilang ketika user meng-upgrade ke versi baru.
 */
import { app } from "electron";
import path from "path";
import fs from "fs";

let cachedDbPath: string | null = null;

export function getDatabaseUrl(): string {
  // Override via env (untuk testing / custom path)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (cachedDbPath) {
    return `file:${cachedDbPath}`;
  }

  // Saat berjalan sebagai Electron app (packaged atau electron .)
  if (app && app.isPackaged !== undefined) {
    const userDataPath = app.getPath("userData");
    // Pastikan direktori ada
    try {
      fs.mkdirSync(userDataPath, { recursive: true });
    } catch {
      // ignore — mungkin sudah ada
    }
    cachedDbPath = path.join(userDataPath, "pos-brilink.db");
    return `file:${cachedDbPath}`;
  }

  // Fallback: dev mode — file:./data.db di root project
  return "file:./data.db";
}

/**
 * Set DATABASE_URL ke process.env agar dibaca oleh src/db/index.ts.
 * Dipanggil dari main.ts SEBELUM Next.js server di-spawn.
 */
export function applyDatabaseUrl(): void {
  const url = getDatabaseUrl();
  process.env.DATABASE_URL = url;
}
