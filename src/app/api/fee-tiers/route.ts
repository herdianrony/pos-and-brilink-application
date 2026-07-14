import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feeTiers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const serviceId = sp.get("serviceId");
  
  if (serviceId) {
    const data = await db.select().from(feeTiers)
      .where(eq(feeTiers.serviceId, parseInt(serviceId)))
      .orderBy(asc(feeTiers.minAmount));
    return NextResponse.json(data);
  }
  
  const data = await db.select().from(feeTiers).orderBy(asc(feeTiers.serviceId), asc(feeTiers.minAmount));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  
  if (b.action === "save_tiers") {
    // Delete existing tiers for this service
    await db.delete(feeTiers).where(eq(feeTiers.serviceId, b.serviceId));
    
    // Insert new tiers
    if (b.tiers && b.tiers.length > 0) {
      await db.insert(feeTiers).values(
        b.tiers.map((t: { minAmount: string; maxAmount: string | null; adminFee: string; agentFee: string }) => ({
          serviceId: b.serviceId,
          minAmount: t.minAmount,
          maxAmount: t.maxAmount || null,
          adminFee: t.adminFee,
          agentFee: t.agentFee,
        }))
      );
    }
    
    return NextResponse.json({ ok: true });
  }
  
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
