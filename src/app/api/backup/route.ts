import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireAdmin } from "@/lib/auth";
import { readFile, writeFile, copyFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_PATH = process.env.DATABASE_URL || "file:./data.db";

function getDbFilePath(): string {
  if (DB_PATH.startsWith("file:")) return DB_PATH.slice(5);
  return DB_PATH;
}

// GET /api/backup — download database backup
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const dbPath = getDbFilePath();
    if (!existsSync(dbPath)) {
      return NextResponse.json({ error: "Database tidak ditemukan" }, { status: 404 });
    }

    const data = await readFile(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.db`;

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Gagal backup database" }, { status: 500 });
  }
}

// POST /api/backup — restore database from uploaded file
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const dbPath = getDbFilePath();

    // Backup current database first
    if (existsSync(dbPath)) {
      const backupPath = `${dbPath}.pre-restore-${Date.now()}`;
      await copyFile(dbPath, backupPath);
    }

    // Get file from request body
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate it's a valid SQLite file (magic header)
    if (buffer.length < 16 || buffer.subarray(0, 15).toString() !== "SQLite format 3") {
      return NextResponse.json({ error: "File bukan database SQLite yang valid" }, { status: 400 });
    }

    // Write restored database
    await writeFile(dbPath, buffer);

    return NextResponse.json({
      ok: true,
      message: "Database berhasil di-restore. Aplikasi perlu dimulai ulang.",
    });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json({ error: "Gagal restore database" }, { status: 500 });
  }
}
