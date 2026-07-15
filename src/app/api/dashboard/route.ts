import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, products, accounts } from "@/db/schema";
import { sql, eq, gte, and, desc, asc, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // P0-03: Only count completed (not void/reversed) in omzet/profit
  // Pending is shown separately, void/reversed excluded entirely
  const validStatus = sql`(${transactions.status} IS NULL OR ${transactions.status} IN ('completed', 'pending'))`;

  const [todayAll] = await db.select({
    count: sql<number>`CAST(count(*) AS INTEGER)`,
    revenue: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.totalAmount} ELSE 0 END),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.profit} ELSE 0 END),0) AS TEXT)`,
  }).from(transactions).where(gte(transactions.createdAt, today));

  const [todayPos] = await db.select({
    count: sql<number>`CAST(count(*) AS INTEGER)`,
    total: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.totalAmount} ELSE 0 END),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.profit} ELSE 0 END),0) AS TEXT)`,
  }).from(transactions).where(and(gte(transactions.createdAt, today), eq(transactions.type, "pos")));

  const [todayBrilink] = await db.select({
    count: sql<number>`CAST(count(*) AS INTEGER)`,
    total: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.totalAmount} ELSE 0 END),0) AS TEXT)`,
    fee: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.adminFee} ELSE 0 END),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.profit} ELSE 0 END),0) AS TEXT)`,
  }).from(transactions).where(and(gte(transactions.createdAt, today), eq(transactions.type, "brilink")));

  const lowStock = await db.select().from(products)
    .where(and(sql`${products.stock} <= ${products.minStock}`, eq(products.isActive, true)))
    .limit(10);

  const recent = await db.select().from(transactions)
    .orderBy(desc(transactions.createdAt)).limit(8);

  const last7 = await db.select({
    date: sql<string>`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch')`,
    revenue: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.totalAmount} ELSE 0 END),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.profit} ELSE 0 END),0) AS TEXT)`,
    count: sql<number>`CAST(count(*) AS INTEGER)`,
  }).from(transactions)
    .where(sql`${transactions.createdAt} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()}`)
    .groupBy(sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch') asc`);

  const accountBalances = await db.select().from(accounts).where(eq(accounts.isActive, true)).orderBy(asc(accounts.id));

  const [pendingResult] = await db.select({
    count: sql<number>`CAST(count(*) AS INTEGER)`,
  }).from(transactions).where(eq(transactions.status, "pending"));

  return NextResponse.json({
    today: { ...todayAll, pos: todayPos, brilink: todayBrilink },
    lowStock,
    recent,
    last7,
    accounts: accountBalances,
    pendingCount: pendingResult?.count || 0,
  });
}
