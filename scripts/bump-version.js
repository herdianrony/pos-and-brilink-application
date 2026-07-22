#!/usr/bin/env node
/*
 * Bump versi aplikasi secara konsisten untuk release Electron.
 * Usage:
 *   node scripts/bump-version.js patch|minor|major|1.2.3
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const level = process.argv[2];

function fail(message) {
  console.error(`[bump-version] ${message}`);
  process.exit(1);
}

if (!level) fail("Usage: node scripts/bump-version.js patch|minor|major|1.2.3");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`);
}

function parseVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) fail(`Version tidak valid: ${version}`);
  return match.slice(1, 4).map(Number);
}

function nextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(bump)) return bump;
  const [major, minor, patch] = parseVersion(current);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  fail(`Argumen bump tidak dikenal: ${bump}`);
}

const pkg = readJson("package.json");
const oldVersion = pkg.version;
const newVersion = nextVersion(oldVersion, level);

pkg.version = newVersion;
writeJson("package.json", pkg);

for (const lockFile of ["package-lock.json", "npm-shrinkwrap.json"]) {
  const full = path.join(root, lockFile);
  if (!fs.existsSync(full)) continue;
  const lock = readJson(lockFile);
  lock.version = newVersion;
  if (lock.packages && lock.packages[""]) lock.packages[""].version = newVersion;
  writeJson(lockFile, lock);
}

console.log(`[bump-version] ${oldVersion} -> ${newVersion}`);
console.log("[bump-version] Langkah berikutnya:");
console.log("  1. Update CHANGELOG.md");
console.log("  2. npm run release:check");
console.log("  3. git commit -am \"chore: release v%s\"", newVersion);
console.log("  4. git tag v%s", newVersion);
console.log("  5. GH_TOKEN=... npm run release:publish");
