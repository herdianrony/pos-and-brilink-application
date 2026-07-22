import { NextResponse } from "next/server";
import { appendAppLog } from "@/lib/app-log";

export function handleApiError(context: string, error: unknown, message = "Terjadi kesalahan pada server") {
  console.error(`[api] ${context}:`, error);
  void appendAppLog("error", context, message, error).catch(() => {});
  return NextResponse.json({ error: message }, { status: 500 });
}
