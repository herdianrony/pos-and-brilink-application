import { NextResponse } from "next/server";
import { db, parseSafeNumber } from "@/db";
import { brilinkServices, serviceCategories, feeTiers } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
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
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  // Generate code from name if not provided (slugify)
  const code = b.code || String(b.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `svc_${Date.now()}`;
  const [row] = await db.insert(brilinkServices).values({
    code,
    name: b.name,
    categoryId: b.categoryId || null,
    categoryCode: b.categoryCode || null,
    icon: b.icon || "credit-card",
    adminFee: b.adminFee?.toString() || "0",
    agentFee: b.agentFee?.toString() || "0",
    useTieredFee: b.useTieredFee || false,
    cashEffect: b.cashEffect || "in",
    bankEffect: b.bankEffect || "out",
    flowType: b.flowType || "payment",
    defaultFeeMethod: b.defaultFeeMethod || "cash",
    description: b.description || null,
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  const [row] = await db.update(brilinkServices).set({
    name: b.name,
    categoryId: b.categoryId || null,
    categoryCode: b.categoryCode || null,
    icon: b.icon,
    adminFee: b.adminFee?.toString(),
    agentFee: b.agentFee?.toString(),
    useTieredFee: b.useTieredFee ?? false,
    cashEffect: b.cashEffect || "in",
    bankEffect: b.bankEffect || "out",
    // P1: Allow admin to edit flow metadata
    flowType: b.flowType || "payment",
    defaultFeeMethod: b.defaultFeeMethod || "cash",
    description: b.description || null,
  }).where(eq(brilinkServices.id, b.id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  await db.update(brilinkServices).set({ isActive: false }).where(eq(brilinkServices.id, b.id));
  return NextResponse.json({ ok: true });
}
