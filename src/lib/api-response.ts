import { NextResponse } from "next/server";

export function handleApiError(context: string, error: unknown, message = "Terjadi kesalahan pada server") {
  console.error(`[api] ${context}:`, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
