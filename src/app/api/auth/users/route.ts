import { NextResponse } from "next/server";
import { db, dbReady } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { validatePasswordPolicy } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateString(value: unknown, field: string, max = 100): string | NextResponse {
  const str = String(value || "").trim();
  if (!str) return NextResponse.json({ error: `${field} wajib diisi` }, { status: 400 });
  if (str.length > max) return NextResponse.json({ error: `${field} maksimal ${max} karakter` }, { status: 400 });
  return str;
}

// GET — list all users (admin only)
export async function GET() {
  try {
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
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Gagal memuat daftar user" }, { status: 500 });
  }
}

// POST — create new user (admin only)
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    await dbReady;

    const b = await req.json();
    const name = validateString(b.name, "Nama", 100);
    if (name instanceof NextResponse) return name;
    const username = validateString(b.username, "Username", 50);
    if (username instanceof NextResponse) return username;
    const password = String(b.password || "");
    if (!password) return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 });

    const passwordPolicy = validatePasswordPolicy(password);
    if (!passwordPolicy.ok) {
      return NextResponse.json({ error: passwordPolicy.error }, { status: 400 });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      name,
      username,
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
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}

// PUT — update user (admin only)
export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    await dbReady;

    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 });

    const name = validateString(b.name, "Nama", 100);
    if (name instanceof NextResponse) return name;
    const role = b.role === "kasir" ? "kasir" : "admin";

    const updates: Record<string, unknown> = {
      name,
      role,
      isActive: Boolean(b.isActive),
      updatedAt: new Date(),
    };

    if (b.password) {
      const password = String(b.password);
      const passwordPolicy = validatePasswordPolicy(password);
      if (!passwordPolicy.ok) {
        return NextResponse.json({ error: passwordPolicy.error }, { status: 400 });
      }
      updates.passwordHash = await hashPassword(password);
    }

    const [user] = await db.update(users).set(updates).where(eq(users.id, b.id)).returning({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Users PUT error:", error);
    return NextResponse.json({ error: "Gagal memperbarui user" }, { status: 500 });
  }
}

// DELETE — soft delete (deactivate) user (admin only)
export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    await dbReady;

    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 });

    if (b.id === auth.user.id) {
      return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
    }

    await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, b.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ error: "Gagal menonaktifkan user" }, { status: 500 });
  }
}
