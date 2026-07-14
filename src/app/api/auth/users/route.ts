import { NextResponse } from "next/server";
import { db, dbReady } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — list all users (admin only)
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await dbReady;

  const data = await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    role: users.role,
    isActive: users.isActive,
    lastLoginAt: users.lastLoginAt,
    createdAt: users.createdAt,
  }).from(users);

  return NextResponse.json(data);
}

// POST — create new user (admin only)
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const b = await req.json();
  if (!b.name || !b.username || !b.password) {
    return NextResponse.json({ error: "Nama, username, dan password wajib diisi" }, { status: 400 });
  }
  if (b.password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  // Check if username already exists
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, b.username)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
  }

  const passwordHash = await hashPassword(b.password);
  const [user] = await db.insert(users).values({
    name: b.name,
    username: b.username,
    passwordHash,
    role: b.role === "kasir" ? "kasir" : "admin",
  }).returning({
    id: users.id,
    name: users.name,
    username: users.username,
    role: users.role,
    isActive: users.isActive,
  });

  return NextResponse.json(user);
}

// PUT — update user (admin only)
export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 });

  const updates: Record<string, unknown> = {
    name: b.name,
    role: b.role,
    isActive: b.isActive,
    updatedAt: new Date(),
  };

  // Jika password diisi, update password
  if (b.password && b.password.length >= 6) {
    updates.passwordHash = await hashPassword(b.password);
  }

  const [user] = await db.update(users).set(updates).where(eq(users.id, b.id)).returning({
    id: users.id,
    name: users.name,
    username: users.username,
    role: users.role,
    isActive: users.isActive,
  });

  return NextResponse.json(user);
}

// DELETE — soft delete (deactivate) user (admin only)
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 });

  // Prevent self-delete
  if (b.id === auth.user.id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, b.id));
  return NextResponse.json({ ok: true });
}
