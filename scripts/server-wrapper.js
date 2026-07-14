/**
 * scripts/server-wrapper.js
 *
 * Wrapper untuk Next.js standalone server.js
 * Polyfill Fetch API globals (Request, Response, Headers, fetch, FormData)
 * yang tidak ada di Node.js 16 (Electron 22) tapi dibutuhkan Next.js 16.
 *
 * Node.js 18+ punya Fetch API built-in, tapi Electron 22.3.27 pakai
 * Node.js 16 yang TIDAK punya. Next.js 16 butuh globals ini di startup.
 *
 * Solusi: pakai 'undici' (sudah ada di standalone node_modules) untuk
 * polyfill globals sebelum require('next').
 */

// ── Polyfill Fetch API globals untuk Node.js 16 ──
try {
  // undici sudah bundled di Next.js standalone node_modules
  const undici = require("undici");

  if (typeof globalThis.Request === "undefined") {
    globalThis.Request = undici.Request;
  }
  if (typeof globalThis.Response === "undefined") {
    globalThis.Response = undici.Response;
  }
  if (typeof globalThis.Headers === "undefined") {
    globalThis.Headers = undici.Headers;
  }
  if (typeof globalThis.fetch === "undefined") {
    globalThis.fetch = undici.fetch;
  }
  if (typeof globalThis.FormData === "undefined") {
    globalThis.FormData = undici.FormData;
  }
  if (typeof globalThis.Blob === "undefined" && undici.Blob) {
    globalThis.Blob = undici.Blob;
  }
  if (typeof globalThis.File === "undefined" && undici.File) {
    globalThis.File = undici.File;
  }

  console.log("[server-wrapper] Fetch API globals polyfilled (undici)");
} catch (e) {
  console.error("[server-wrapper] Failed to load undici polyfill:", e.message);
  // Fallback: coba node-fetch
  try {
    const nodeFetch = require("node-fetch");
    if (typeof globalThis.fetch === "undefined") {
      globalThis.fetch = nodeFetch;
      globalThis.Request = nodeFetch.Request;
      globalThis.Response = nodeFetch.Response;
      globalThis.Headers = nodeFetch.Headers;
    }
    console.log("[server-wrapper] Fetch API globals polyfilled (node-fetch)");
  } catch (e2) {
    console.error("[server-wrapper] node-fetch also not available:", e2.message);
  }
}

// Polyfill lain yang mungkin dibutuhkan
if (typeof globalThis.WebSocket === "undefined") {
  try {
    globalThis.WebSocket = require("ws");
    console.log("[server-wrapper] WebSocket polyfilled (ws)");
  } catch {
    // ws tidak ada, skip
  }
}

// ── Load Next.js standalone server ──────────────
// Path ke server.js asli (satu folder dengan wrapper ini)
const path = require("path");
const serverPath = path.join(__dirname, "server.js");
console.log("[server-wrapper] Loading Next.js server from:", serverPath);
require(serverPath);
