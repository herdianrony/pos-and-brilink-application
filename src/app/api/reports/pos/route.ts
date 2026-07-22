import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactionItems, transactions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(
    y,
    m - 1,
    d,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return date;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const end = parseDate(url.searchParams.get("end"), true) || new Date();
    const start =
      parseDate(url.searchParams.get("start")) ||
      new Date(end.getFullYear(), end.getMonth(), 1);

    const baseConds = [
      eq(transactions.type, "pos"),
      ne(transactions.status, "void"),
      ne(transactions.status, "reversed"),
      gte(transactions.createdAt, start),
      lte(transactions.createdAt, end),
    ];

    const [summary] = await db
      .select({
        count: sql<number>`CAST(count(*) AS INTEGER)`,
        revenue: sql<number>`CAST(coalesce(sum(${transactions.totalAmount}),0) AS REAL)`,
        profit: sql<number>`CAST(coalesce(sum(${transactions.profit}),0) AS REAL)`,
        average: sql<number>`CAST(coalesce(avg(${transactions.totalAmount}),0) AS REAL)`,
      })
      .from(transactions)
      .where(and(...baseConds));

    const byPayment = await db
      .select({
        paymentMethod: transactions.paymentMethod,
        count: sql<number>`CAST(count(*) AS INTEGER)`,
        revenue: sql<number>`CAST(coalesce(sum(${transactions.totalAmount}),0) AS REAL)`,
        profit: sql<number>`CAST(coalesce(sum(${transactions.profit}),0) AS REAL)`,
      })
      .from(transactions)
      .where(and(...baseConds))
      .groupBy(transactions.paymentMethod);

    const products = await db
      .select({
        productId: transactionItems.productId,
        productName: transactionItems.productName,
        qty: sql<number>`CAST(coalesce(sum(${transactionItems.quantity}),0) AS INTEGER)`,
        grossSales: sql<number>`CAST(coalesce(sum(${transactionItems.subtotal}),0) AS REAL)`,
      })
      .from(transactionItems)
      .innerJoin(
        transactions,
        eq(transactionItems.transactionId, transactions.id),
      )
      .where(and(...baseConds))
      .groupBy(transactionItems.productId, transactionItems.productName)
      .orderBy(sql`sum(${transactionItems.subtotal}) desc`)
      .limit(50);

    const daily = await db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch', 'localtime')`,
        count: sql<number>`CAST(count(*) AS INTEGER)`,
        revenue: sql<number>`CAST(coalesce(sum(${transactions.totalAmount}),0) AS REAL)`,
        profit: sql<number>`CAST(coalesce(sum(${transactions.profit}),0) AS REAL)`,
      })
      .from(transactions)
      .where(and(...baseConds))
      .groupBy(
        sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch', 'localtime')`,
      )
      .orderBy(
        sql`strftime('%Y-%m-%d', ${transactions.createdAt} / 1000, 'unixepoch', 'localtime') asc`,
      );

    const revenue = Number(summary?.revenue || 0);
    const profit = Number(summary?.profit || 0);

    return NextResponse.json({
      start: start.toISOString(),
      end: end.toISOString(),
      summary: {
        count: Number(summary?.count || 0),
        revenue,
        profit,
        cogs: revenue - profit,
        average: Number(summary?.average || 0),
      },
      byPayment,
      products,
      daily,
    });
  } catch (error) {
    return handleApiError("reports/pos:GET", error, "Gagal memuat laporan POS");
  }
}
