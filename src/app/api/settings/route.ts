import { NextResponse } from "next/server";
import { db, runTransaction } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keys that contain sensitive data (hashed PINs etc.) — never sent to client
const SENSITIVE_KEYS = ["discount_admin_pin"];

// Keys that are hashed on write (admin PIN for discount authorization)
const HASHED_KEYS = ["discount_admin_pin"];

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const r of rows) {
      // P1-01: Don't send hashed PIN value — send a flag instead
      if (r.key === "discount_admin_pin") {
        map["discount_admin_pin_set"] = r.value ? "true" : "false";
        // Don't include the actual hash
      } else {
        map[r.key] = r.value;
      }
    }
    return NextResponse.json(map);

  } catch (error) {
    return handleApiError("src/app/api/settings/route.ts:GET", error, "Gagal memproses pengaturan");
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const body: Record<string, string> = await req.json();

    // P1-01: Only hash and store PIN if user actually entered a new value
    // Skip "****" or empty — don't overwrite existing PIN
    const processed: Record<string, string> = {};
    for (const [key, rawValue] of Object.entries(body)) {
      if (HASHED_KEYS.includes(key)) {
        const value = String(rawValue || "").trim();
        if (!value || value === "****") {
          // Empty or sentinel — skip, don't overwrite existing PIN
          continue;
        }
        // Hash the new PIN
        const bcrypt = require("bcryptjs");
        processed[key] = await bcrypt.hash(value, 10);
      } else {
        processed[key] = String(rawValue);
      }
    }

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

  } catch (error) {
    return handleApiError("src/app/api/settings/route.ts:PUT", error, "Gagal memproses pengaturan");
  }
}
