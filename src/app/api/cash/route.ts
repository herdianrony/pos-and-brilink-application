import { NextResponse } from "next/server";
import { db, parseSafeNumber } from "@/db";
import { cashBalance } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  // F-07: properly check auth result
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const data = await db.select().from(cashBalance).orderBy(desc(cashBalance.id)).limit(50);
  const [last] = data;
  return NextResponse.json({ balance: last?.balanceAfter || 0, history: data });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();
  const [last] = await db.select({ balanceAfter: cashBalance.balanceAfter })
    .from(cashBalance).orderBy(desc(cashBalance.id)).limit(1);
  const current = last ? last.balanceAfter : 0;
  // F-07: Safe numeric parsing
  const amt = parseSafeNumber(b.amount, { allowNegative: true, default: 0 });
  const newBal = b.type === "opening" ? amt : current + amt;

  const [row] = await db.insert(cashBalance).values({
    type: b.type || "adjustment",
    amount: amt,
    balanceAfter: newBal,
    notes: b.notes ? String(b.notes) : null,
  }).returning();
  return NextResponse.json(row);
}