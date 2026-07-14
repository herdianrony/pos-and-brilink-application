import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceCategories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  // F-07: properly check auth result
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const data = await db.select().from(serviceCategories)
    .where(eq(serviceCategories.isActive, true))
    .orderBy(asc(serviceCategories.sortOrder));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  // Generate code from name if not provided (slugify)
  const code = b.code || String(b.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `cat_${Date.now()}`;
  const [row] = await db.insert(serviceCategories).values({
    code,
    name: b.name,
    icon: b.icon || "credit-card",
    color: b.color || "#0ea5e9",
    sortOrder: b.sortOrder ?? 0,
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  const [row] = await db.update(serviceCategories).set({
    name: b.name,
    icon: b.icon,
    color: b.color,
    sortOrder: b.sortOrder,
  }).where(eq(serviceCategories.id, b.id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  await db.update(serviceCategories).set({ isActive: false }).where(eq(serviceCategories.id, b.id));
  return NextResponse.json({ ok: true });
}
