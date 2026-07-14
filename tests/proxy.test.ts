import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Proxy/Middleware Logic Tests ─────────────────
// Test route protection logic without real Next.js

// Replikasi logic dari src/proxy.ts
const COOKIE_NAME = "brilink_pos_session";

const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/about",
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/logout",
  "/api/health",
  "/api/seed",
];

const EXCLUDED_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

function isExcluded(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function getRouteAction(pathname: string, hasValidToken: boolean): "allow" | "redirect_login" | "return_401" | "redirect_home" {
  // Skip excluded
  if (isExcluded(pathname)) return "allow";

  // User already logged in, accessing /login or /setup → redirect to /
  if ((pathname === "/login" || pathname === "/setup") && hasValidToken) {
    return "redirect_home";
  }

  // Public path → allow
  if (isPublicPath(pathname)) return "allow";

  // Protected path without token
  if (!hasValidToken) {
    if (pathname.startsWith("/api/")) return "return_401";
    return "redirect_login";
  }

  // Has valid token → allow
  return "allow";
}

describe("Proxy: Excluded prefixes", () => {
  it("should exclude _next paths", () => {
    expect(isExcluded("/_next/static/chunk.js")).toBe(true);
    expect(isExcluded("/_next/image")).toBe(true);
  });

  it("should exclude favicon", () => {
    expect(isExcluded("/favicon.ico")).toBe(true);
  });

  it("should not exclude normal paths", () => {
    expect(isExcluded("/")).toBe(false);
    expect(isExcluded("/dashboard")).toBe(false);
    expect(isExcluded("/api/products")).toBe(false);
  });
});

describe("Proxy: Public paths", () => {
  it("should allow /login", () => {
    expect(isPublicPath("/login")).toBe(true);
  });

  it("should allow /setup", () => {
    expect(isPublicPath("/setup")).toBe(true);
  });

  it("should allow /about", () => {
    expect(isPublicPath("/about")).toBe(true);
  });

  it("should allow /api/auth/login", () => {
    expect(isPublicPath("/api/auth/login")).toBe(true);
  });

  it("should allow /api/auth/setup", () => {
    expect(isPublicPath("/api/auth/setup")).toBe(true);
  });

  it("should allow /api/health", () => {
    expect(isPublicPath("/api/health")).toBe(true);
  });

  it("should allow /api/seed", () => {
    expect(isPublicPath("/api/seed")).toBe(true);
  });

  it("should not allow protected paths", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/api/products")).toBe(false);
    expect(isPublicPath("/api/accounts")).toBe(false);
    expect(isPublicPath("/api/transactions")).toBe(false);
  });
});

describe("Proxy: Route actions (unauthenticated)", () => {
  const noToken = false;

  it("should redirect to /login for page routes", () => {
    expect(getRouteAction("/", noToken)).toBe("redirect_login");
    expect(getRouteAction("/dashboard", noToken)).toBe("redirect_login");
    expect(getRouteAction("/pos", noToken)).toBe("redirect_login");
  });

  it("should return 401 for API routes", () => {
    expect(getRouteAction("/api/products", noToken)).toBe("return_401");
    expect(getRouteAction("/api/accounts", noToken)).toBe("return_401");
    expect(getRouteAction("/api/transactions", noToken)).toBe("return_401");
    expect(getRouteAction("/api/dashboard", noToken)).toBe("return_401");
  });

  it("should allow public paths", () => {
    expect(getRouteAction("/login", noToken)).toBe("allow");
    expect(getRouteAction("/setup", noToken)).toBe("allow");
    expect(getRouteAction("/about", noToken)).toBe("allow");
    expect(getRouteAction("/api/auth/login", noToken)).toBe("allow");
    expect(getRouteAction("/api/health", noToken)).toBe("allow");
    expect(getRouteAction("/api/seed", noToken)).toBe("allow");
  });

  it("should allow excluded paths", () => {
    expect(getRouteAction("/_next/static/chunk.js", noToken)).toBe("allow");
    expect(getRouteAction("/favicon.ico", noToken)).toBe("allow");
  });
});

describe("Proxy: Route actions (authenticated)", () => {
  const hasToken = true;

  it("should allow all protected paths", () => {
    expect(getRouteAction("/", hasToken)).toBe("allow");
    expect(getRouteAction("/dashboard", hasToken)).toBe("allow");
    expect(getRouteAction("/api/products", hasToken)).toBe("allow");
    expect(getRouteAction("/api/accounts", hasToken)).toBe("allow");
  });

  it("should redirect /login to / when logged in", () => {
    expect(getRouteAction("/login", hasToken)).toBe("redirect_home");
  });

  it("should redirect /setup to / when logged in", () => {
    expect(getRouteAction("/setup", hasToken)).toBe("redirect_home");
  });

  it("should still allow public paths when logged in", () => {
    expect(getRouteAction("/about", hasToken)).toBe("allow");
    expect(getRouteAction("/api/health", hasToken)).toBe("allow");
  });
});

describe("Proxy: Edge cases", () => {
  it("should handle nested public paths", () => {
    expect(isPublicPath("/api/auth/login/sub")).toBe(true);
  });

  it("should not match partial path names", () => {
    expect(isPublicPath("/loginpage")).toBe(false);
    expect(isPublicPath("/setup-config")).toBe(false);
  });

  it("should handle root path", () => {
    expect(getRouteAction("/", false)).toBe("redirect_login");
    expect(getRouteAction("/", true)).toBe("allow");
  });

  it("should handle unknown API routes", () => {
    expect(getRouteAction("/api/unknown", false)).toBe("return_401");
    expect(getRouteAction("/api/unknown", true)).toBe("allow");
  });
});
