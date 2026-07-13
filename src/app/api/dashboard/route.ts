import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, products, accounts } from "@/db/schema";
import { sql, eq, gte, and, desc, asc } from "drizzle-orm";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayAll] = await db.select({
    count: sql<number>`CAST(count(*) AS INTEGER)`,
    revenue: sql<string>`CAST(coalesce(sum(${transactions.totalAmount}),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(${transactions.profit}),0) AS TEXT)`,
  }).from(transactions).where(gte(transactions.createdAt, today));

  const [todayPos] = await db.select({
    count: sql<number>`CAST(count(*) AS INTEGER)`,
    total: sql<string>`CAST(coalesce(sum(${transactions.totalAmount}),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(${transactions.profit}),0) AS TEXT)`,
  }).from(transactions).where(and(gte(transactions.createdAt, today), eq(transactions.type, "pos")));

  const [todayBrilink] = await db.select({
    count: sql<number>`CAST(count(*) AS INTEGER)`,
    total: sql<string>`CAST(coalesce(sum(${transactions.totalAmount}),0) AS TEXT)`,
    fee: sql<string>`CAST(coalesce(sum(${transactions.adminFee}),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(${transactions.profit}),0) AS TEXT)`,
  }).from(transactions).where(and(gte(transactions.createdAt, today), eq(transactions.type, "brilink")));

  const lowStock = await db.select().from(products)
    .where(and(sql`${products.stock} <= ${products.minStock}`, eq(products.isActive, true)))
    .limit(10);

  const recent = await db.select().from(transactions)
    .orderBy(desc(transactions.createdAt)).limit(8);

  const last7 = await db.select({
    date: sql<string>`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch')`,
    revenue: sql<string>`CAST(coalesce(sum(${transactions.totalAmount}),0) AS TEXT)`,
    profit: sql<string>`CAST(coalesce(sum(${transactions.profit}),0) AS TEXT)`,
    count: sql<number>`CAST(count(*) AS INTEGER)`,
  }).from(transactions)
    .where(sql`${transactions.createdAt} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()}`)
    .groupBy(sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch') asc`);

  const accountBalances = await db.select().from(accounts).where(eq(accounts.isActive, true)).orderBy(asc(accounts.id));

  return NextResponse.json({
    today: { ...todayAll, pos: todayPos, brilink: todayBrilink },
    lowStock,
    recent,
    last7,
    accounts: accountBalances,
  });
}