/**
 * scripts/post-build.js
 *
 * Copy static assets & public folder ke .next/standalone/
 * Next.js standalone output TIDAK include:
 * - .next/static (CSS, JS chunks)
 * - public/ (static assets like icons, images)
 *
 * File ini harus dijalankan SETELAH `next build` dan SEBELUM `electron-builder`.
 *
 * Juga bersihkan dist-electron lama untuk hindari EBUSY error di Windows.
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticSrc = path.join(projectRoot, ".next", "static");
const staticDst = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(projectRoot, "public");
const publicDst = path.join(standaloneDir, "public");
const distElectronDir = path.join(projectRoot, "dist-electron");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.log(`[post-build] SKIP (not found): ${src}`);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[post-build] Cleaned: ${dir}`);
  } catch (e) {
    console.warn(`[post-build] WARNING: Cannot delete ${dir}: ${e.message}`);
    console.warn(`[post-build] Coba tutup aplikasi yang mungkin pakai file di folder tersebut,`);
    console.warn(`[post-build] atau hapus manual: rmdir /S /Q "${dir}"`);
  }
}

console.log("[post-build] Step 1: Clean old dist-electron...");
rmDir(distElectronDir);

console.log("[post-build] Step 2: Copying static assets to standalone...");

if (!fs.existsSync(standaloneDir)) {
  console.error(`[post-build] ERROR: Standalone dir not found: ${standaloneDir}`);
  console.error("[post-build] Pastikan 'next build' sudah dijalankan dengan output: 'standalone'");
  process.exit(1);
}

// Copy .next/static → standalone/.next/static
copyDir(staticSrc, staticDst);
console.log(`[post-build] Copied: .next/static → standalone/.next/static`);

// Copy public → standalone/public
copyDir(publicSrc, publicDst);
console.log(`[post-build] Copied: public → standalone/public`);

// Copy server-wrapper.js → standalone/server-wrapper.js
// Wrapper ini polyfill Fetch API globals untuk Node.js 16 (Electron 22)
const wrapperSrc = path.join(projectRoot, "scripts", "server-wrapper.js");
const wrapperDst = path.join(standaloneDir, "server-wrapper.js");
if (fs.existsSync(wrapperSrc)) {
  fs.copyFileSync(wrapperSrc, wrapperDst);
  console.log(`[post-build] Copied: scripts/server-wrapper.js → standalone/server-wrapper.js`);
} else {
  console.warn(`[post-build] WARNING: server-wrapper.js not found at ${wrapperSrc}`);
}

// Copy undici → standalone/node_modules/undici
// Next.js 16 butuh Fetch API globals (Request, Response, fetch, dll) yang
// built-in di Node.js 18+. Electron 22 pakai Node 16 yang TIDAK punya.
// undici adalah polyfill untuk Fetch API.
const undiciSrc = path.join(projectRoot, "node_modules", "undici");
const undiciDst = path.join(standaloneDir, "node_modules", "undici");
if (fs.existsSync(undiciSrc)) {
  copyDir(undiciSrc, undiciDst);
  console.log(`[post-build] Copied: node_modules/undici → standalone/node_modules/undici`);
} else {
  console.warn(`[post-build] WARNING: undici not found. Fetch API polyfill will fail!`);
}

console.log("[post-build] Done. Standalone ready for electron-builder.");

