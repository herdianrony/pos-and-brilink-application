import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, products, accounts } from "@/db/schema";
import { sql, eq, gte, and, desc, asc, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyAggregate = { count: 0, revenue: "0", profit: "0" };
const emptyTypeAggregate = { count: 0, total: "0", profit: "0" };
const emptyBrilinkAggregate = { count: 0, total: "0", fee: "0", profit: "0" };

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLast7Days(
  raw: Array<{ date: string; revenue: string; profit: string; count: number }>,
) {
  const byDate = new Map(raw.map((row) => [row.date, row]));
  return Array.from({ length: 7 }, (_, idx) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - idx));
    const key = toLocalDateKey(date);
    const row = byDate.get(key);
    return {
      date: key,
      revenue: row?.revenue || "0",
      profit: row?.profit || "0",
      count: row?.count || 0,
    };
  });
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // P0-03 + P1: Exclude void/reversed from count, revenue, and profit
  const validCount = sql`CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN 1 ELSE 0 END`;
  const validAmount = sql`CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.totalAmount} ELSE 0 END`;
  const validProfit = sql`CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.profit} ELSE 0 END`;
  const validFee = sql`CASE WHEN ${transactions.status} != 'void' AND ${transactions.status} != 'reversed' THEN ${transactions.adminFee} ELSE 0 END`;

  const [todayAll] = await db
    .select({
      count: sql<number>`CAST(sum(${validCount}) AS INTEGER)`,
      revenue: sql<string>`CAST(coalesce(sum(${validAmount}),0) AS TEXT)`,
      profit: sql<string>`CAST(coalesce(sum(${validProfit}),0) AS TEXT)`,
    })
    .from(transactions)
    .where(gte(transactions.createdAt, today));

  const [todayPos] = await db
    .select({
      count: sql<number>`CAST(sum(${validCount}) AS INTEGER)`,
      total: sql<string>`CAST(coalesce(sum(${validAmount}),0) AS TEXT)`,
      profit: sql<string>`CAST(coalesce(sum(${validProfit}),0) AS TEXT)`,
    })
    .from(transactions)
    .where(
      and(gte(transactions.createdAt, today), eq(transactions.type, "pos")),
    );

  const [todayBrilink] = await db
    .select({
      count: sql<number>`CAST(sum(${validCount}) AS INTEGER)`,
      total: sql<string>`CAST(coalesce(sum(${validAmount}),0) AS TEXT)`,
      fee: sql<string>`CAST(coalesce(sum(${validFee}),0) AS TEXT)`,
      profit: sql<string>`CAST(coalesce(sum(${validProfit}),0) AS TEXT)`,
    })
    .from(transactions)
    .where(
      and(gte(transactions.createdAt, today), eq(transactions.type, "brilink")),
    );

  const lowStock = await db
    .select()
    .from(products)
    .where(
      and(
        sql`${products.stock} <= ${products.minStock}`,
        eq(products.isActive, true),
      ),
    )
    .limit(10);

  const recent = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(8);

  const last7Start = new Date();
  last7Start.setHours(0, 0, 0, 0);
  last7Start.setDate(last7Start.getDate() - 6);

  const last7Rows = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch', 'localtime')`,
      revenue: sql<string>`CAST(coalesce(sum(${validAmount}),0) AS TEXT)`,
      profit: sql<string>`CAST(coalesce(sum(${validProfit}),0) AS TEXT)`,
      count: sql<number>`CAST(sum(${validCount}) AS INTEGER)`,
    })
    .from(transactions)
    .where(sql`${transactions.createdAt} >= ${last7Start.getTime()}`)
    .groupBy(
      sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch', 'localtime')`,
    )
    .orderBy(
      sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch', 'localtime') asc`,
    );
  const last7 = buildLast7Days(last7Rows);

  const accountBalances = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true))
    .orderBy(asc(accounts.id));

  const [pendingResult] = await db
    .select({
      count: sql<number>`CAST(count(*) AS INTEGER)`,
    })
    .from(transactions)
    .where(eq(transactions.status, "pending"));

  const isAdmin = auth.user.role === "admin";

  return NextResponse.json({
    today: {
      ...emptyAggregate,
      ...(todayAll || {}),
      count: Number(todayAll?.count || 0),
      revenue: todayAll?.revenue || "0",
      profit: isAdmin ? todayAll?.profit || "0" : "0",
      pos: {
        ...emptyTypeAggregate,
        ...(todayPos || {}),
        count: Number(todayPos?.count || 0),
        total: todayPos?.total || "0",
        profit: isAdmin ? todayPos?.profit || "0" : "0",
      },
      brilink: {
        ...emptyBrilinkAggregate,
        ...(todayBrilink || {}),
        count: Number(todayBrilink?.count || 0),
        total: todayBrilink?.total || "0",
        fee: isAdmin ? todayBrilink?.fee || "0" : "0",
        profit: isAdmin ? todayBrilink?.profit || "0" : "0",
      },
    },
    lowStock: lowStock || [],
    recent: recent || [],
    last7: isAdmin ? last7 : last7.map((row) => ({ ...row, profit: "0" })),
    accounts: accountBalances || [],
    pendingCount: pendingResult?.count || 0,
  });
}
