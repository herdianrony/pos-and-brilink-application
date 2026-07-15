import { NextRequest, NextResponse } from "next/server";
import { db, dbReady } from "@/db";
import { accountMutations, accounts } from "@/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // P2: defense-in-depth — requireAuth even though proxy already checks
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await dbReady;
  const sp = req.nextUrl.searchParams;
  const accountId = sp.get("accountId");
  const limit = parseInt(sp.get("limit") || "200");
  const startDate = sp.get("startDate"); // ISO date: 2024-01-01
  const endDate = sp.get("endDate"); // ISO date: 2024-12-31

  // Build where conditions
  const conditions = [];
  if (accountId) {
    conditions.push(eq(accountMutations.accountId, parseInt(accountId)));
  }
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    conditions.push(gte(accountMutations.createdAt, start));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(accountMutations.createdAt, end));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get mutations — ascending for running balance, then reverse for display
  const data = await db
    .select({
      id: accountMutations.id,
      accountId: accountMutations.accountId,
      accountName: accounts.name,
      accountIcon: accounts.icon,
      accountColor: accounts.color,
      type: accountMutations.type,
      amount: accountMutations.amount,
      balanceAfter: accountMutations.balanceAfter,
      notes: accountMutations.notes,
      referenceId: accountMutations.referenceId,
      createdAt: accountMutations.createdAt,
    })
    .from(accountMutations)
    .leftJoin(accounts, eq(accountMutations.accountId, accounts.id))
    .where(whereClause)
    .orderBy(desc(accountMutations.id))
    .limit(limit);

  // Calculate summary
  let totalIn = 0;
  let totalOut = 0;
  for (const m of data) {
    const amt = Number(m.amount);
    if (amt > 0) totalIn += amt;
    else totalOut += Math.abs(amt);
  }
  const firstBalance = data.length > 0 ? Number(data[data.length - 1].balanceAfter) : 0;
  const lastBalance = data.length > 0 ? Number(data[0].balanceAfter) : 0;
  const openingBalance = firstBalance - (data.length > 0 ? Number(data[data.length - 1].amount) : 0);

  return NextResponse.json({
    mutations: data,
    summary: {
      count: data.length,
      totalIn,
      totalOut,
      openingBalance,
      closingBalance: lastBalance,
      netChange: lastBalance - openingBalance,
    },
  });
}
