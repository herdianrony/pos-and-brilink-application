import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
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

  } catch (error) {
    return handleApiError("src/app/api/categories/route.ts:GET", error, "Gagal memproses data kategori");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const [row] = await db.insert(categories).values({
      name: body.name,
      icon: body.icon || "package",
      color: body.color || "#6366f1",
    }).returning();
    return NextResponse.json(row);

  } catch (error) {
    return handleApiError("src/app/api/categories/route.ts:POST", error, "Gagal memproses data kategori");
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const [row] = await db.update(categories).set({
      name: body.name,
      icon: body.icon,
      color: body.color,
    }).where(eq(categories.id, body.id)).returning();
    return NextResponse.json(row);

  } catch (error) {
    return handleApiError("src/app/api/categories/route.ts:PUT", error, "Gagal memproses data kategori");
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const body = await req.json();
    await db.update(categories).set({ isActive: false }).where(eq(categories.id, body.id));
    return NextResponse.json({ ok: true });

  } catch (error) {
    return handleApiError("src/app/api/categories/route.ts:DELETE", error, "Gagal memproses data kategori");
  }
}
