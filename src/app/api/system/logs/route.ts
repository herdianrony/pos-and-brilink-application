import { NextResponse } from "next/server";
import { appendAppLog, clearAppLogs, readLogs, type AppLogLevel } from "@/lib/app-log";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || 200);
    const level = url.searchParams.get("level") || "all";
    const q = url.searchParams.get("q") || "";
    const entries = await readLogs({ limit, level, q });
    return NextResponse.json({ entries });
  } catch (error) {
    return handleApiError("system/logs:GET", error, "Gagal memuat log aplikasi");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const level = ["debug", "info", "warn", "error"].includes(body.level) ? (body.level as AppLogLevel) : "info";
    const source = String(body.source || "renderer").slice(0, 120);
    const message = String(body.message || "").slice(0, 1000);
    if (!message) return NextResponse.json({ error: "message wajib diisi" }, { status: 400 });

    await appendAppLog(level, source, message, body.details);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError("system/logs:POST", error, "Gagal menulis log aplikasi");
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    await clearAppLogs();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError("system/logs:DELETE", error, "Gagal membersihkan log aplikasi");
  }
}
