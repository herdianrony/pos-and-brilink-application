import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { asc, eq, ilike, and } from "drizzle-orm";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") || "";
  const categoryId = sp.get("categoryId");

  const conds = [eq(products.isActive, true)];
  if (search) {
    // Search by name OR barcode
    conds.push(ilike(products.name, `%${search}%`));
  }
  if (categoryId && categoryId !== "all") conds.push(eq(products.categoryId, parseInt(categoryId)));

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
  const b = await req.json();
  const [row] = await db.insert(products).values({
    name: b.name,
    barcode: b.barcode || null,
    categoryId: b.categoryId || null,
    buyPrice: b.buyPrice?.toString() || "0",
    sellPrice: b.sellPrice.toString(),
    stock: b.stock ?? 0,
    minStock: b.minStock ?? 5,
    unit: b.unit || "pcs",
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const b = await req.json();
  const [row] = await db.update(products).set({
    name: b.name,
    barcode: b.barcode || null,
    categoryId: b.categoryId || null,
    buyPrice: b.buyPrice?.toString() || "0",
    sellPrice: b.sellPrice.toString(),
    stock: b.stock ?? 0,
    minStock: b.minStock ?? 5,
    unit: b.unit || "pcs",
    updatedAt: new Date(),
  }).where(eq(products.id, b.id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const b = await req.json();
  await db.update(products).set({ isActive: false }).where(eq(products.id, b.id));
  return NextResponse.json({ ok: true });
}
