import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { readFile, writeFile, copyFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RESTORE_SIZE_BYTES = 128 * 1024 * 1024;

function getDbFilePath(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./data.db";
  return dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;
}

async function verifySqliteIntegrity(filePath: string): Promise<boolean> {
  // Import lazily so Next/Turbopack does not trace libSQL native/runtime internals
  // while statically analyzing this route for standalone output.
  const { createClient } = await import("@libsql/client");
  const client = createClient({ url: `file:${filePath}` });
  try {
    const result = await client.execute("PRAGMA integrity_check");
    return result.rows.length === 1 && String(result.rows[0].integrity_check).toLowerCase() === "ok";
  } finally {
    client.close();
  }
}

// GET /api/backup — download database backup
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

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
    return handleApiError("backup:GET", error, "Gagal backup database");
  }
}

// POST /api/backup — restore database from uploaded file
export async function POST(req: Request) {
  let tempPath: string | null = null;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const dbPath = getDbFilePath();
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_RESTORE_SIZE_BYTES) {
      return NextResponse.json({ error: "Ukuran file backup terlalu besar" }, { status: 400 });
    }

    if (buffer.length < 16 || buffer.subarray(0, 15).toString() !== "SQLite format 3") {
      return NextResponse.json({ error: "File bukan database SQLite yang valid" }, { status: 400 });
    }

    tempPath = `${dbPath}.restore-check-${Date.now()}`;
    await writeFile(tempPath, buffer);

    const isIntegrityOk = await verifySqliteIntegrity(tempPath);
    if (!isIntegrityOk) {
      return NextResponse.json({ error: "Database backup gagal integrity_check" }, { status: 400 });
    }

    if (existsSync(dbPath)) {
      const backupPath = `${dbPath}.pre-restore-${Date.now()}`;
      await copyFile(dbPath, backupPath);
    }

    await writeFile(dbPath, buffer);

    return NextResponse.json({
      ok: true,
      message: "Database berhasil di-restore. Aplikasi perlu dimulai ulang.",
    });
  } catch (error) {
    return handleApiError("backup:POST", error, "Gagal restore database");
  } finally {
    if (tempPath && existsSync(tempPath)) {
      await unlink(tempPath).catch(() => {});
    }
  }
}
