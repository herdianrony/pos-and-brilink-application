import { NextResponse } from "next/server";
import { db, runTransaction } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keys that contain sensitive data (hashed PINs etc.) — never sent to client
const SENSITIVE_KEYS = ["discount_admin_pin"];

// Keys that are hashed on write (admin PIN for discount authorization)
const HASHED_KEYS = ["discount_admin_pin"];

export async function GET() {
  // F-07: properly check auth result
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const r of rows) {
    // Don't leak sensitive values
    if (SENSITIVE_KEYS.includes(r.key)) {
      map[r.key] = r.value ? "****" : "";
    } else {
      map[r.key] = r.value;
    }
  }
  return NextResponse.json(map);
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body: Record<string, string> = await req.json();

  // F-07: Hash sensitive keys before storing
  const processed: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(body)) {
    if (HASHED_KEYS.includes(key)) {
      const value = String(rawValue || "").trim();
      if (!value) {
        // Empty value → clear the key
        processed[key] = "";
      } else {
        // Hash the PIN
        const bcrypt = require("bcryptjs");
        processed[key] = await bcrypt.hash(value, 10);
      }
    } else {
      processed[key] = String(rawValue);
    }
  }

  // F-04: Atomic upsert within transaction
  await runTransaction(async (tx) => {
    for (const [key, value] of Object.entries(processed)) {
      const existing = await tx.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        await tx.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
      } else {
        await tx.insert(settings).values({ key, value });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
