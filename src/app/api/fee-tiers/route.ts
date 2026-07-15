import { NextRequest, NextResponse } from "next/server";
import { db, parseSafeNumber, runTransaction } from "@/db";
import { feeTiers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    // F-07: properly check auth result
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const sp = req.nextUrl.searchParams;
    const serviceId = sp.get("serviceId");

    if (serviceId) {
      const sid = parseInt(serviceId, 10);
      if (!Number.isFinite(sid) || sid <= 0) {
        return NextResponse.json({ error: "serviceId tidak valid" }, { status: 400 });
      }
      const data = await db.select().from(feeTiers)
        .where(eq(feeTiers.serviceId, sid))
        .orderBy(asc(feeTiers.minAmount));
      return NextResponse.json(data);
    }

    const data = await db.select().from(feeTiers).orderBy(asc(feeTiers.serviceId), asc(feeTiers.minAmount));
    return NextResponse.json(data);

  } catch (error) {
    return handleApiError("src/app/api/fee-tiers/route.ts:GET", error, "Gagal memproses fee tier");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const b = await req.json();

    if (b.action === "save_tiers") {
      const serviceId = Number(b.serviceId);
      if (!Number.isFinite(serviceId) || serviceId <= 0) {
        return NextResponse.json({ error: "serviceId tidak valid" }, { status: 400 });
      }
      // F-03: atomic delete + insert
      await runTransaction(async (tx) => {
        await tx.delete(feeTiers).where(eq(feeTiers.serviceId, serviceId));
        if (Array.isArray(b.tiers) && b.tiers.length > 0) {
          // F-07: validate each tier
          const validTiers: Array<{ serviceId: number; minAmount: number; maxAmount: number | null; adminFee: number; agentFee: number }> = [];
          for (const t of b.tiers) {
            const minAmount = parseSafeNumber(t.minAmount, { min: 0, default: 0 });
            const adminFee = parseSafeNumber(t.adminFee, { min: 0, default: 0 });
            const agentFee = parseSafeNumber(t.agentFee, { min: 0, default: 0 });
            const maxAmount: number | null = (() => {
              if (t.maxAmount == null || t.maxAmount === "") return null;
              const n = parseSafeNumber(t.maxAmount, { min: 0, default: NaN });
              return Number.isFinite(n) ? n : null;
            })();
            validTiers.push({ serviceId, minAmount, maxAmount, adminFee, agentFee });
          }
          if (validTiers.length > 0) {
            await tx.insert(feeTiers).values(validTiers);
          }
        }
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    return handleApiError("src/app/api/fee-tiers/route.ts:POST", error, "Gagal memproses fee tier");
  }
}
