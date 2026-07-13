import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems } from "@/db/schema";
import { eq } from "drizzle-orm";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [trx] = await db.select().from(transactions).where(eq(transactions.id, parseInt(id)));
  if (!trx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, trx.id));
  return NextResponse.json({ ...trx, items });
}
