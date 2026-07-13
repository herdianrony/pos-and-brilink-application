import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accountMutations, accounts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const accountId = sp.get("accountId");
  const limit = parseInt(sp.get("limit") || "50");

  if (accountId) {
    const data = await db.select({
      id: accountMutations.id,
      accountId: accountMutations.accountId,
      accountName: accounts.name,
      accountIcon: accounts.icon,
      type: accountMutations.type,
      amount: accountMutations.amount,
      balanceAfter: accountMutations.balanceAfter,
      notes: accountMutations.notes,
      referenceId: accountMutations.referenceId,
      createdAt: accountMutations.createdAt,
    })
      .from(accountMutations)
      .leftJoin(accounts, eq(accountMutations.accountId, accounts.id))
      .where(eq(accountMutations.accountId, parseInt(accountId)))
      .orderBy(desc(accountMutations.id))
      .limit(limit);
    return NextResponse.json(data);
  }

  const data = await db.select({
    id: accountMutations.id,
    accountId: accountMutations.accountId,
    accountName: accounts.name,
    accountIcon: accounts.icon,
    type: accountMutations.type,
    amount: accountMutations.amount,
    balanceAfter: accountMutations.balanceAfter,
    notes: accountMutations.notes,
    referenceId: accountMutations.referenceId,
    createdAt: accountMutations.createdAt,
  })
    .from(accountMutations)
    .leftJoin(accounts, eq(accountMutations.accountId, accounts.id))
    .orderBy(desc(accountMutations.id))
    .limit(limit);
  return NextResponse.json(data);
}
