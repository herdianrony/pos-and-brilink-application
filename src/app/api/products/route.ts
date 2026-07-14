import { NextRequest, NextResponse } from "next/server";
import { db, parseSafeNumber } from "@/db";
import { products, categories } from "@/db/schema";
import { asc, eq, and, or, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // F-07: properly check auth result
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") || "";
  const categoryId = sp.get("categoryId");

  const conds = [eq(products.isActive, true)];
  if (search) {
    conds.push(or(
      sql`lower(${products.name}) LIKE lower(${'%' + search + '%'})`,
      sql`${products.barcode} LIKE ${'%' + search + '%'}`
    ) as any);
  }
  if (categoryId && categoryId !== "all") {
    const cid = parseInt(categoryId, 10);
    if (Number.isFinite(cid) && cid > 0) conds.push(eq(products.categoryId, cid));
  }

  const data = await db
    .select({
      id: products.id,
      name: products.name,
      barcode: products.barcode,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      buyPrice: products.buyPrice,
      sellPrice: products.sellPrice,
      stock: products.stock,
      minStock: products.minStock,
      unit: products.unit,
      image: products.image,
      isActive: products.isActive,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conds))
    .orderBy(asc(products.name));

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  // F-07: Safe numeric parsing
  const buyPrice = parseSafeNumber(b.buyPrice, { default: 0, min: 0 });
  const sellPrice = parseSafeNumber(b.sellPrice, { default: 0, min: 0 });
  if (sellPrice <= 0) {
    return NextResponse.json({ error: "Harga jual wajib > 0" }, { status: 400 });
  }
  const [row] = await db.insert(products).values({
    name: String(b.name || "").trim(),
    barcode: b.barcode ? String(b.barcode) : null,
    categoryId: b.categoryId || null,
    buyPrice,
    sellPrice,
    stock: Math.max(0, Math.floor(Number(b.stock ?? 0))),
    minStock: Math.max(0, Math.floor(Number(b.minStock ?? 5))),
    unit: b.unit || "pcs",
    image: b.image || null,
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  // F-07: Safe numeric parsing
  const buyPrice = parseSafeNumber(b.buyPrice, { default: 0, min: 0 });
  const sellPrice = parseSafeNumber(b.sellPrice, { default: 0, min: 0 });
  if (sellPrice <= 0) {
    return NextResponse.json({ error: "Harga jual wajib > 0" }, { status: 400 });
  }
  const [row] = await db.update(products).set({
    name: String(b.name || "").trim(),
    barcode: b.barcode ? String(b.barcode) : null,
    categoryId: b.categoryId || null,
    buyPrice,
    sellPrice,
    stock: Math.max(0, Math.floor(Number(b.stock ?? 0))),
    minStock: Math.max(0, Math.floor(Number(b.minStock ?? 5))),
    unit: b.unit || "pcs",
    image: b.image || null,
    updatedAt: new Date(),
  }).where(eq(products.id, b.id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  await db.update(products).set({ isActive: false }).where(eq(products.id, b.id));
  return NextResponse.json({ ok: true });
}
