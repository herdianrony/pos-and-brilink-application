import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const data = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [row] = await db.insert(categories).values({
    name: body.name,
    icon: body.icon || "package",
    color: body.color || "#6366f1",
  }).returning();
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const [row] = await db.update(categories).set({
    name: body.name,
    icon: body.icon,
    color: body.color,
  }).where(eq(categories.id, body.id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  await db.update(categories).set({ isActive: false }).where(eq(categories.id, body.id));
  return NextResponse.json({ ok: true });
}
