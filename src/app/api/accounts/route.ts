import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, accountMutations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAuth();
  const data = await db.select().from(accounts);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  // R-03: requireAdmin for all account mutations (create, adjust, transfer, update, delete)
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const b = await req.json();

  // ── Create account ──────────────────────────────
  if (b.action === "create") {
    const [acc] = await db.insert(accounts).values({
      code: b.code,
      name: b.name,
      icon: b.icon || "wallet",
      color: b.color || "#00875A",
      balance: parseFloat(b.balance || "0"),
      minBalance: parseFloat(b.minBalance || "100000"),
      isActive: b.isActive !== false,
    }).returning();

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

  // ── Adjust balance (sesuaikan saldo) ────────────
  if (b.action === "adjust") {
    const [acc] = await db.select().from(accounts).where(eq(accounts.id, b.accountId));
    if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const amount = parseFloat(b.amount || "0");
    const newBalance = acc.balance + amount;

    await db.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, b.accountId));
    await db.insert(accountMutations).values({
      accountId: b.accountId,
      type: b.type || b.mutationType || "adjustment",
      amount,
      balanceAfter: newBalance,
      notes: b.notes || null,
      referenceId: b.referenceId || null,
    });
    return NextResponse.json({ success: true, newBalance });
  }

  // ── Transfer between accounts ───────────────────
  if (b.action === "transfer") {
    const [fromAcc] = await db.select().from(accounts).where(eq(accounts.id, b.fromAccountId));
    const [toAcc] = await db.select().from(accounts).where(eq(accounts.id, b.toAccountId));
    if (!fromAcc || !toAcc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // H-01: Larang self-transfer (transfer ke rekening yang sama)
    if (b.fromAccountId === b.toAccountId) {
      return NextResponse.json({ error: "Tidak bisa transfer ke rekening yang sama" }, { status: 400 });
    }

    const amount = parseFloat(b.amount || "0");
    // H-01: Validasi amount — harus finite, positif
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
    }
    if (fromAcc.balance < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

    const newFromBalance = fromAcc.balance - amount;
    const newToBalance = toAcc.balance + amount;

    await db.update(accounts).set({ balance: newFromBalance, updatedAt: new Date() }).where(eq(accounts.id, b.fromAccountId));
    await db.update(accounts).set({ balance: newToBalance, updatedAt: new Date() }).where(eq(accounts.id, b.toAccountId));
    await db.insert(accountMutations).values([
      { accountId: b.fromAccountId, type: "transfer_out", amount: -amount, balanceAfter: newFromBalance, notes: b.notes || `Transfer ke ${toAcc.name}` },
      { accountId: b.toAccountId, type: "transfer_in", amount, balanceAfter: newToBalance, notes: b.notes || `Transfer dari ${fromAcc.name}` },
    ]);
    return NextResponse.json({ success: true });
  }

  // ── Update account (edit nama, icon, dll) ───────
  if (b.action === "update") {
    const [acc] = await db.update(accounts).set({
      name: b.name,
      icon: b.icon,
      color: b.color,
      minBalance: parseFloat(b.minBalance || "0"),
      updatedAt: new Date(),
    }).where(eq(accounts.id, b.id)).returning();
    return NextResponse.json(acc);
  }

  // ── Delete account (soft delete) ────────────────
  if (b.action === "delete") {
    await db.update(accounts).set({ isActive: false, updatedAt: new Date() }).where(eq(accounts.id, b.id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// PUT handler — handle create/update/delete via PUT (untuk kompatibilitas Cash.tsx)
export async function PUT(req: Request) {
  return POST(req);
}
