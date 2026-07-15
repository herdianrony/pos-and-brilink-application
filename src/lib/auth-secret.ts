const MIN_AUTH_SECRET_LENGTH = 32;
const DEV_SECRET_GLOBAL_KEY = "__POS_BRILINK_DEV_AUTH_SECRET__";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength = 48): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Resolve AUTH_SECRET for JWT signing/verifying.
 *
 * Production must provide AUTH_SECRET explicitly. Electron packaged mode injects
 * a per-installation random AUTH_SECRET from electron/main.ts before starting
 * the Next.js standalone server.
 *
 * Development/test mode generates a random per-process secret and stores it in
 * process.env so API routes and proxy share the same value in the same dev
 * server process. No predictable fixed secret is kept in source code.
 */
export function getAuthSecretBytes(): Uint8Array {
  const envSecret = process.env.AUTH_SECRET;
  if (envSecret && envSecret.length >= MIN_AUTH_SECRET_LENGTH) {
    return new TextEncoder().encode(envSecret);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET wajib di production (min 32 chars). Set env var atau jalankan via Electron.");
  }

  const store = globalThis as typeof globalThis & Record<string, string | undefined>;
  if (!store[DEV_SECRET_GLOBAL_KEY]) {
    store[DEV_SECRET_GLOBAL_KEY] = randomHex(48);
    process.env.AUTH_SECRET = store[DEV_SECRET_GLOBAL_KEY];
    console.warn("[auth] AUTH_SECRET tidak diset. Dev/test memakai random per-process secret.");
  }

  return new TextEncoder().encode(store[DEV_SECRET_GLOBAL_KEY]);
}
