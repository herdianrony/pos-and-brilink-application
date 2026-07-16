/**
 * scripts/pre-build.js
 *
 * Clean stale Next.js build/dev artifacts before production build.
 *
 * Why:
 * - `next dev` can leave `.next/dev/types/*` around.
 * - On Windows, stale/corrupted generated validator files can be picked up
 *   during `next build` type checking and fail the build.
 * - WhatsApp/Chromium session files must never live under `.next` output.
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const targets = [
  path.join(projectRoot, ".next"),
];

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[pre-build] Cleaned: ${dir}`);
  } catch (error) {
    console.warn(`[pre-build] WARNING: Cannot delete ${dir}: ${error.message}`);
    console.warn(`[pre-build] Tutup proses dev/build yang masih berjalan, lalu hapus manual jika perlu:`);
    console.warn(`[pre-build]   rmdir /S /Q "${dir}"`);
  }
}

console.log("[pre-build] Cleaning stale Next.js artifacts...");
for (const target of targets) rmDir(target);
console.log("[pre-build] Done.");
