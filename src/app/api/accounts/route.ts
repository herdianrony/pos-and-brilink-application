import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, accountMutations } from "@/db/schema";
import { eq } from "drizzle-orm";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const data = await db.select().from(accounts);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const b = await req.json();

  if (b.action === "create") {
    const [acc] = await db.insert(accounts).values({
      code: b.code,
      name: b.name,
      icon: b.icon || "💰",
      color: b.color || "#10b981",
      balance: parseFloat(b.balance || "0"),
      minBalance: parseFloat(b.minBalance || "100000"),
      isActive: b.isActive !== false,
    }).returning();

    // Initial balance mutation
    if (acc && parseFloat(b.balance || "0") > 0) {
      await db.insert(accountMutations).values({
        accountId: acc.id,
        type: "opening",
        amount: parseFloat(b.balance || "0"),
        balanceAfter: parseFloat(b.balance || "0"),
        notes: `Saldo awal ${acc.name}`,
      });
    }

    return NextResponse.json(acc);
  }

  if (b.action === "adjust") {
    const [acc] = await db.select().from(accounts).where(eq(accounts.id, b.accountId));
    if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const amount = parseFloat(b.amount || "0");
    const newBalance = acc.balance + amount;

    await db.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, b.accountId));
    await db.insert(accountMutations).values({
      accountId: b.accountId,
      type: b.type || "adjustment",
      amount,
      balanceAfter: newBalance,
      notes: b.notes || null,
      referenceId: b.referenceId || null,
    });

    return NextResponse.json({ success: true, newBalance });
  }

  if (b.action === "transfer") {
    // Transfer between accounts (e.g., deposit cash to bank)
    const [fromAcc] = await db.select().from(accounts).where(eq(accounts.id, b.fromAccountId));
    const [toAcc] = await db.select().from(accounts).where(eq(accounts.id, b.toAccountId));

    if (!fromAcc || !toAcc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const amount = parseFloat(b.amount || "0");
    if (amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const fromBalance = fromAcc.balance;
    if (fromBalance < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

    const newFromBalance = fromBalance - amount;
    const newToBalance = toAcc.balance + amount;

    // Update both accounts
    await db.update(accounts).set({ balance: newFromBalance, updatedAt: new Date() }).where(eq(accounts.id, b.fromAccountId));
    await db.update(accounts).set({ balance: newToBalance, updatedAt: new Date() }).where(eq(accounts.id, b.toAccountId));

    // Create mutation records
    await db.insert(accountMutations).values([
      { accountId: b.fromAccountId, type: "transfer_out", amount: -amount, balanceAfter: newFromBalance, notes: b.notes || `Transfer ke ${toAcc.name}` },
      { accountId: b.toAccountId, type: "transfer_in", amount, balanceAfter: newToBalance, notes: b.notes || `Transfer dari ${fromAcc.name}` },
    ]);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}