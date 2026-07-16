import { NextResponse } from "next/server";
import { db, parseSafeNumber, runTransaction } from "@/db";
import { brilinkServices, serviceCategories, feeTiers } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeFeeTiers(rawTiers: unknown, serviceId: number) {
  if (!Array.isArray(rawTiers)) return [];
  const tiers = rawTiers.map((tier) => {
    const t = tier as Record<string, unknown>;
    const minAmount = parseSafeNumber(t.minAmount, { min: 0, default: 0 });
    const maxAmount = t.maxAmount == null || t.maxAmount === ""
      ? null
      : parseSafeNumber(t.maxAmount, { min: 0, default: 0 });
    const adminFee = parseSafeNumber(t.adminFee, { min: 0, default: 0 });
    const agentFee = parseSafeNumber(t.agentFee ?? t.adminFee, { min: 0, default: adminFee });
    return { serviceId, minAmount, maxAmount, adminFee, agentFee };
  }).sort((a, b) => a.minAmount - b.minAmount);

  let previousMax: number | null = null;
  for (const tier of tiers) {
    if (tier.maxAmount !== null && tier.maxAmount < tier.minAmount) {
      throw new Error(`Tier tidak valid: nominal max ${tier.maxAmount} lebih kecil dari nominal min ${tier.minAmount}`);
    }
    if (previousMax !== null && tier.minAmount <= previousMax) {
      throw new Error("Tier fee berjenjang overlap. Pastikan nominal min lebih besar dari max tier sebelumnya.");
    }
    previousMax = tier.maxAmount;
  }

  return tiers;
}

export async function GET() {
  try {
    // F-07: properly check auth result
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const services = await db
      .select({
        id: brilinkServices.id,
        code: brilinkServices.code,
        name: brilinkServices.name,
        categoryId: brilinkServices.categoryId,
        categoryCode: brilinkServices.categoryCode,
        categoryName: serviceCategories.name,
        categoryIcon: serviceCategories.icon,
        categoryColor: serviceCategories.color,
        icon: brilinkServices.icon,
        adminFee: brilinkServices.adminFee,
        agentFee: brilinkServices.agentFee,
        useTieredFee: brilinkServices.useTieredFee,
        cashEffect: brilinkServices.cashEffect,
        bankEffect: brilinkServices.bankEffect,
        // P1: Expose flow metadata to frontend
        flowType: brilinkServices.flowType,
        defaultFeeMethod: brilinkServices.defaultFeeMethod,
        description: brilinkServices.description,
        isActive: brilinkServices.isActive,
      })
      .from(brilinkServices)
      .leftJoin(serviceCategories, eq(brilinkServices.categoryId, serviceCategories.id))
      .where(eq(brilinkServices.isActive, true))
      .orderBy(asc(serviceCategories.sortOrder), asc(brilinkServices.name));
  
    // Get fee tiers for services that use tiered fees
    const tiers = await db.select().from(feeTiers).orderBy(asc(feeTiers.serviceId), asc(feeTiers.minAmount));
  
    // Attach tiers to services
    const data = services.map(s => ({
      ...s,
      feeTiers: tiers.filter(t => t.serviceId === s.id),
    }));
  
    return NextResponse.json(data);

  } catch (error) {
    return handleApiError("src/app/api/brilink-services/route.ts:GET", error, "Gagal memproses data layanan");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const b = await req.json();
    if (!String(b.name || "").trim()) {
      return NextResponse.json({ error: "Nama layanan wajib diisi" }, { status: 400 });
    }

    return await runTransaction(async (tx) => {
      // Generate code from name if not provided (slugify)
      const code = b.code || String(b.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `svc_${Date.now()}`;
      const [row] = await tx.insert(brilinkServices).values({
        code,
        name: String(b.name).trim(),
        categoryId: b.categoryId || null,
        categoryCode: b.categoryCode || null,
        icon: b.icon || "credit-card",
        adminFee: b.adminFee?.toString() || "0",
        agentFee: b.agentFee?.toString() || b.adminFee?.toString() || "0",
        useTieredFee: b.useTieredFee || false,
        cashEffect: b.cashEffect || "in",
        bankEffect: b.bankEffect || "out",
        flowType: b.flowType || "payment",
        defaultFeeMethod: b.defaultFeeMethod || "cash",
        description: b.description || null,
      }).returning();

      const tiers = b.useTieredFee ? normalizeFeeTiers(b.feeTiers || b.tiers, row.id) : [];
      if (tiers.length > 0) {
        await tx.insert(feeTiers).values(tiers);
      }

      return NextResponse.json({ ...row, feeTiers: tiers });
    });

  } catch (error) {
    return handleApiError("src/app/api/brilink-services/route.ts:POST", error, "Gagal memproses data layanan");
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "ID layanan wajib diisi" }, { status: 400 });
    if (!String(b.name || "").trim()) {
      return NextResponse.json({ error: "Nama layanan wajib diisi" }, { status: 400 });
    }

    return await runTransaction(async (tx) => {
      const [row] = await tx.update(brilinkServices).set({
        name: String(b.name).trim(),
        categoryId: b.categoryId || null,
        categoryCode: b.categoryCode || null,
        icon: b.icon || "credit-card",
        adminFee: b.adminFee?.toString() || "0",
        agentFee: b.agentFee?.toString() || b.adminFee?.toString() || "0",
        useTieredFee: b.useTieredFee ?? false,
        cashEffect: b.cashEffect || "in",
        bankEffect: b.bankEffect || "out",
        flowType: b.flowType || "payment",
        defaultFeeMethod: b.defaultFeeMethod || "cash",
        description: b.description || null,
      }).where(eq(brilinkServices.id, b.id)).returning();

      await tx.delete(feeTiers).where(eq(feeTiers.serviceId, b.id));
      const tiers = b.useTieredFee ? normalizeFeeTiers(b.feeTiers || b.tiers, b.id) : [];
      if (tiers.length > 0) {
        await tx.insert(feeTiers).values(tiers);
      }

      return NextResponse.json({ ...row, feeTiers: tiers });
    });

  } catch (error) {
    return handleApiError("src/app/api/brilink-services/route.ts:PUT", error, "Gagal memproses data layanan");
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const b = await req.json();
    await db.update(brilinkServices).set({ isActive: false }).where(eq(brilinkServices.id, b.id));
    return NextResponse.json({ ok: true });

  } catch (error) {
    return handleApiError("src/app/api/brilink-services/route.ts:DELETE", error, "Gagal memproses data layanan");
  }
}
