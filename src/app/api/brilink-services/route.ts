import { NextResponse } from "next/server";
import { db } from "@/db";
import { brilinkServices, serviceCategories, feeTiers } from "@/db/schema";
import { asc, eq } from "drizzle-orm";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const services = await db
    .select({
      id: brilinkServices.id,
      name: brilinkServices.name,
      categoryId: brilinkServices.categoryId,
      categoryName: serviceCategories.name,
      categoryIcon: serviceCategories.icon,
      categoryColor: serviceCategories.color,
      icon: brilinkServices.icon,
      adminFee: brilinkServices.adminFee,
      agentFee: brilinkServices.agentFee,
      useTieredFee: brilinkServices.useTieredFee,
      cashEffect: brilinkServices.cashEffect,
      bankEffect: brilinkServices.bankEffect,
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
  const b = await req.json();
  const [row] = await db.insert(brilinkServices).values({
    name: b.name,
    categoryId: b.categoryId || null,
    icon: b.icon || "💳",
    adminFee: b.adminFee?.toString() || "0",
    agentFee: b.agentFee?.toString() || "0",
    useTieredFee: b.useTieredFee || false,
    cashEffect: b.cashEffect || "in",
    bankEffect: b.bankEffect || "out",
    description: b.description || null,
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const b = await req.json();
  const [row] = await db.update(brilinkServices).set({
    name: b.name,
    categoryId: b.categoryId || null,
    icon: b.icon,
    adminFee: b.adminFee?.toString(),
    agentFee: b.agentFee?.toString(),
    useTieredFee: b.useTieredFee ?? false,
    cashEffect: b.cashEffect || "in",
    bankEffect: b.bankEffect || "out",
    description: b.description || null,
  }).where(eq(brilinkServices.id, b.id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const b = await req.json();
  await db.update(brilinkServices).set({ isActive: false }).where(eq(brilinkServices.id, b.id));
  return NextResponse.json({ ok: true });
}
