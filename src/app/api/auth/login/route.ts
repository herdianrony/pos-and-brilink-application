import { NextResponse } from "next/server";
import { db, dbReady } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_LOGIN_ERROR = "Username atau password salah";
const DUMMY_BCRYPT_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8uZpoyb7rQzcnx9qny4dYfVkf4g1Iy";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_LOCK_MS = 15 * 60 * 1000;

interface LoginLimitState {
  failedCount: number;
  firstFailedAt: number;
  lockedUntil: number;
}

const loginLimits = new Map<string, LoginLimitState>();

function getClientIp(req: Request): string {
  const forwardedFor = req.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local";
}

function loginLimitKey(req: Request, username: string): string {
  return `${getClientIp(req)}:${username.toLowerCase()}`;
}

function getLimitState(key: string, now = Date.now()): LoginLimitState {
  const existing = loginLimits.get(key);
  if (!existing || now - existing.firstFailedAt > LOGIN_WINDOW_MS) {
    const fresh = { failedCount: 0, firstFailedAt: now, lockedUntil: 0 };
    loginLimits.set(key, fresh);
    return fresh;
  }
  return existing;
}

function checkRateLimit(key: string, now = Date.now()): NextResponse | null {
  const state = getLimitState(key, now);
  if (state.lockedUntil > now) {
    const retryAfter = Math.ceil((state.lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}

function recordFailedLogin(key: string, now = Date.now()) {
  const state = getLimitState(key, now);
  state.failedCount += 1;

  if (state.failedCount >= MAX_FAILED_ATTEMPTS) {
    const extraFailures = state.failedCount - MAX_FAILED_ATTEMPTS;
    const lockMs = Math.min(30_000 * 2 ** extraFailures, MAX_LOCK_MS);
    state.lockedUntil = now + lockMs;
  }
}

function clearLoginLimit(key: string) {
  loginLimits.delete(key);
}

function genericInvalidLogin(key: string) {
  recordFailedLogin(key);
  return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
}

export async function POST(req: Request) {
  try {
    await dbReady;
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 },
      );
    }

    const key = loginLimitKey(req, username);
    const skipRateLimit =
      process.env.E2E === "1" && username.toLowerCase() === "admin";
    const limited = skipRateLimit ? null : checkRateLimit(key);
    if (limited) return limited;

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    const user = rows[0];

    // Always run bcrypt compare, even when user does not exist, to reduce
    // username enumeration via timing side-channel.
    const passwordHash = user?.passwordHash || DUMMY_BCRYPT_HASH;
    const valid = await verifyPassword(password, passwordHash);

    if (!user || !user.isActive || !valid) {
      if (skipRateLimit) {
        return NextResponse.json(
          { error: GENERIC_LOGIN_ERROR },
          { status: 401 },
        );
      }
      return genericInvalidLogin(key);
    }

    clearLoginLimit(key);

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const token = await signToken({
      sub: String(user.id),
      username: user.username,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat login" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
