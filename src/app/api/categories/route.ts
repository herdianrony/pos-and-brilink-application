import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  // F-07: properly check auth result
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  // Get categories with product count
  const data = await db.select({
    id: categories.id,
    name: categories.name,
    icon: categories.icon,
    color: categories.color,
    isActive: categories.isActive,
    createdAt: categories.createdAt,
    productCount: sql<number>`count(${products.id})`,
  })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const [row] = await db.insert(categories).values({
    name: body.name,
    icon: body.icon || "package",
    color: body.color || "#6366f1",
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const [row] = await db.update(categories).set({
    name: body.name,
    icon: body.icon,
    color: body.color,
  }).where(eq(categories.id, body.id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  await db.update(categories).set({ isActive: false }).where(eq(categories.id, body.id));
  return NextResponse.json({ ok: true });
}
