import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "brilink_pos_session";

// Rute publik (tidak butuh login)
const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/about",
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/logout",
  "/api/health",
  "/api/seed", // idempotent — aman untuk first-run bootstrap
  "/api/setup/templates", // public only if no users exist (checked in route)
  "/api/setup/complete", // public only if no users exist (checked in route)
];

// Rute yang dilewati proxy (Next internals & static assets)
const EXCLUDED_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

let generatedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  const envSecret = process.env.AUTH_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }
  // R-04: In production, fail-closed
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET wajib di production");
  }
  // Dev: use fixed dev secret (same as auth.ts) so proxy and API routes
  // share the same key across different runtimes (edge vs nodejs)
  const DEV_SECRET = "dev_secret_pos_agen_bisnis_2024_not_for_production_use";
  return new TextEncoder().encode(DEV_SECRET);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

// Next.js 16: middleware.ts diganti proxy.ts.
// Fungsi default export sekarang menjadi proxy handler.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lewati Next internals & static assets
  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cek apakah path publik (exact match atau prefix)
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  // User sudah login tapi mengakses /login atau /setup → redirect ke /
  if ((pathname === "/login" || pathname === "/setup") && payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Rute publik → lanjutkan
  if (isPublic) {
    return NextResponse.next();
  }

  // Rute terproteksi tapi tidak ada session valid → redirect /login (untuk page) atau 401 (untuk API)
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Proxy aktif untuk semua rute kecuali Next internals & static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
