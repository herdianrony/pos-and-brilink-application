import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db, dbReady } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "brilink_pos_session";
const SESSION_DURATION = "7d"; // 7 hari
const SESSION_DURATION_SEC = 60 * 60 * 24 * 7; // 7 hari dalam detik

// Cache generated secret per process
let generatedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  const envSecret = process.env.AUTH_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }

  // R-04: In production, fail-closed if no AUTH_SECRET
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET wajib di production (min 32 chars). Set env var atau jalankan via Electron.");
  }

  // Dev only: generate random per-process
  if (!generatedSecret) {
    const crypto = require("crypto");
    const bytes = crypto.randomBytes(48);
    generatedSecret = new Uint8Array(bytes);
    // R-04: Share with proxy via globalThis
    (globalThis as any).__authSecret = generatedSecret;
    console.warn("[auth] WARNING: AUTH_SECRET tidak diset. Dev mode dengan random secret.");
  }
  return generatedSecret;
}

export interface SessionPayload {
  sub: string; // user id
  username: string;
  name: string;
  role: string;
}

// ── Password Hashing ──────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT Sign / Verify ─────────────────────────────
export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    return {
      sub: payload.sub as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

// ── Cookie helpers (server-side) ──────────────────
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SEC,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

// ── Get current user (server-side) ────────────────
export async function getSession(): Promise<SessionPayload | null> {
  const token = await getSessionCookie();
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  await dbReady;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, parseInt(session.sub)))
    .limit(1);

  if (rows.length === 0) return null;
  if (!rows[0].isActive) return null;
  return rows[0];
}

// ── Auth guard untuk API routes ───────────────────
export async function requireAuth(): Promise<{
  ok: true;
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
} | { ok: false; response: Response }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { ok: true, user };
}

export async function requireAdmin(): Promise<{
  ok: true;
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
} | { ok: false; response: Response }> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin") {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Forbidden", code: "ADMIN_REQUIRED" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return auth;
}

// ── Cek apakah ada user (untuk setup awal) ────────
export async function hasUsers(): Promise<boolean> {
  await dbReady;
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  return rows.length > 0;
}
