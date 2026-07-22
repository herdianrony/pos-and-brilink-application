/**
 * scripts/after-pack.js
 *
 * Electron-builder hook yang dijalankan SETELAH packing selesai.
 * 
 * Fungsi: Copy Next.js standalone (termasuk node_modules) ke resources/standalone/
 * 
 * Masalah: electron-builder otomatis prune node_modules dari extraResources,
 * sehingga Next.js standalone tidak bisa jalan (Cannot find module 'next').
 * Solusi: copy manual di afterPack hook (setelah pruning selesai).
 */
const fs = require("fs");
const path = require("path");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.log(`[after-pack] SKIP (not found): ${src}`);
    return;
  }
  // fs.cpSync handles directories, files, symlinks, and nested structures
  // Available in Node.js 16.7+
  fs.cpSync(src, dst, {
    recursive: true,
    // Don't follow symlinks, copy them as-is
    verbatimSymlinks: true,
  });
}

exports.default = async function (context) {
  const projectDir = context.packager.info.projectDir;
  const appOutDir = context.appOutDir;
  const resourcesDir = path.join(appOutDir, "resources");

  console.log("[after-pack] Copying Next.js standalone to resources/standalone/...");

  const standaloneSrc = path.join(projectDir, ".next", "standalone");
  const standaloneDst = path.join(resourcesDir, "standalone");

  // Copy entire standalone directory (including node_modules)
  copyDir(standaloneSrc, standaloneDst);
  console.log(`[after-pack] Copied: ${standaloneSrc} → ${standaloneDst}`);

  // Copy .next/static (CSS, JS chunks)
  const staticSrc = path.join(projectDir, ".next", "static");
  const staticDst = path.join(standaloneDst, ".next", "static");
  copyDir(staticSrc, staticDst);
  console.log(`[after-pack] Copied: .next/static → standalone/.next/static`);

  // Copy public folder
  const publicSrc = path.join(projectDir, "public");
  const publicDst = path.join(standaloneDst, "public");
  copyDir(publicSrc, publicDst);
  console.log(`[after-pack] Copied: public → standalone/public`);

  // Verify node_modules/next exists
  const nextModulePath = path.join(standaloneDst, "node_modules", "next");
  if (fs.existsSync(nextModulePath)) {
    console.log("[after-pack] ✓ node_modules/next verified");
  } else {
    console.error("[after-pack] ✗ node_modules/next NOT FOUND — server will crash!");
  }

  console.log("[after-pack] Done.");
};
