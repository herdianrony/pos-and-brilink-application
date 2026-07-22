import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthSecretBytes } from "@/lib/auth-secret";

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

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretBytes(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function isAllowedMutationOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestOrigin = req.nextUrl.origin;
    if (origin === requestOrigin) return true;

    const host = req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
    if (host && origin === `${forwardedProto}://${host}`) return true;

    // Electron/local dev can mix localhost and 127.0.0.1 for the same internal port.
    // Treat those loopback origins as equivalent to avoid false Forbidden on first-run setup.
    const requestHost = (host || req.nextUrl.host).split(":")[0];
    const requestPort = (host || req.nextUrl.host).split(":")[1] || req.nextUrl.port;
    if (
      isLoopbackHost(originUrl.hostname) &&
      isLoopbackHost(requestHost) &&
      (originUrl.port || "80") === (requestPort || "80")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
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

  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!isAllowedMutationOrigin(req)) {
      return NextResponse.json(
        { error: "Forbidden", code: "BAD_ORIGIN" },
        { status: 403 }
      );
    }
  }

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
