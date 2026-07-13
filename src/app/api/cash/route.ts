import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashBalance } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const data = await db.select().from(cashBalance).orderBy(desc(cashBalance.id)).limit(50);
  const [last] = data;
  return NextResponse.json({ balance: last?.balanceAfter || 0, history: data });
}

export async function POST(req: Request) {
  const b = await req.json();
  const [last] = await db.select({ balanceAfter: cashBalance.balanceAfter })
    .from(cashBalance).orderBy(desc(cashBalance.id)).limit(1);
  const current = last ? last.balanceAfter : 0;
  const amt = parseFloat(b.amount || "0");
  const newBal = b.type === "opening" ? amt : current + amt;

  const [row] = await db.insert(cashBalance).values({
    type: b.type || "adjustment",
    amount: amt,
    balanceAfter: newBal,
    notes: b.notes || null,
  }).returning();
  return NextResponse.json(row);
}