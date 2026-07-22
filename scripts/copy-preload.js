/**
 * scripts/copy-preload.js
 *
 * Copy preload.js dari electron/dist/preload.js ke electron/dist/preload.js
 * (sudah ada karena tsc compile ke sana). Fungsi script ini hanya verifikasi
 * bahwa file ada, dan pastikan ada (untuk backward compatibility).
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "electron", "dist", "preload.js");

if (!fs.existsSync(target)) {
  console.error(`[copy-preload] preload.js not found at: ${target}`);
  console.error("[copy-preload] Jalankan 'tsc -p tsconfig.electron.json' dulu.");
  process.exit(1);
}

console.log(`[copy-preload] OK: ${target}`);
