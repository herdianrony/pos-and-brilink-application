import { NextResponse } from "next/server";
import { db, dbReady } from "@/db";
import { users } from "@/db/schema";
import { hasUsers, hashPassword, signToken, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/setup
// Hanya boleh dipanggil jika belum ada user sama sekali (initial setup).
// Body: { name, username, password, role? }
export async function POST(req: Request) {
  try {
    await dbReady;
    const alreadyHasUsers = await hasUsers();
    if (alreadyHasUsers) {
      return NextResponse.json(
        {
          error:
            "Setup sudah dilakukan. Silakan login dengan akun yang sudah ada.",
        },
        { status: 409 }
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const role = body.role === "kasir" ? "kasir" : "admin";

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "Nama, username, dan password wajib diisi" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ name, username, passwordHash, role })
      .returning({ id: users.id, name: users.name, username: users.username, role: users.role });

    // Auto-login setelah setup
    const token = await signToken({
      sub: String(user.id),
      username: user.username,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Gagal melakukan setup awal" },
      { status: 500 }
    );
  }
}

// GET /api/auth/setup — cek apakah setup diperlukan
export async function GET() {
  await dbReady;
  const needed = !(await hasUsers());
  return NextResponse.json({ setupNeeded: needed });
}
