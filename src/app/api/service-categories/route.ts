import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceCategories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const data = await db.select().from(serviceCategories)
    .where(eq(serviceCategories.isActive, true))
    .orderBy(asc(serviceCategories.sortOrder));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const b = await req.json();
  const [row] = await db.insert(serviceCategories).values({
    name: b.name,
    icon: b.icon || "💳",
    color: b.color || "#0ea5e9",
    sortOrder: b.sortOrder ?? 0,
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
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
  const b = await req.json();
  await db.update(serviceCategories).set({ isActive: false }).where(eq(serviceCategories.id, b.id));
  return NextResponse.json({ ok: true });
}
