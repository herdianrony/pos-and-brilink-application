import { NextResponse } from "next/server";
import { db, runTransaction, parseSafeNumber } from "@/db";
import { accounts, accountMutations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Helper: slugify name to code ──
// "M-Banking BRI Cadangan" → "m_banking_bri_cadangan"
// "Kas Marketplace" → "kas_marketplace"
function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

// ── Helper: ensure code is unique (append _2, _3, etc. if needed) ──
async function makeUniqueAccountCode(baseCode: string): Promise<string> {
  let code = baseCode;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
    if (!existing) return code;
    code = `${baseCode}_${suffix}`;
    suffix++;
    if (suffix > 100) return `${baseCode}_${Date.now()}`; // safety fallback
  }
}

export async function GET() {
  // F-07: properly check auth result
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
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
    const name = String(b.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama akun wajib diisi" }, { status: 400 });
    }

    // Auto-generate code from name if not provided (slugify + ensure unique)
    let code = String(b.code || "").trim();
    if (!code) {
      const baseCode = slugify(name) || `account_${Date.now()}`;
      code = await makeUniqueAccountCode(baseCode);
    }

    const balance = parseSafeNumber(b.balance, { default: 0, min: 0 });
    const minBalance = parseSafeNumber(b.minBalance, { default: 100000, min: 0 });

    const [existing] = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
    if (existing) {
      return NextResponse.json({ error: `Kode akun "${code}" sudah digunakan` }, { status: 400 });
    }

    const [acc] = await db.insert(accounts).values({
      code,
      name,
      icon: b.icon || "wallet",
      color: b.color || "#00875A",
      balance,
      minBalance,
      isActive: b.isActive !== false,
    }).returning();

    if (acc && balance > 0) {
      await db.insert(accountMutations).values({
        accountId: acc.id,
        type: "opening",
        amount: balance,
        balanceAfter: balance,
        notes: `Saldo awal ${acc.name}`,
      });
    }
    return NextResponse.json(acc);
  }

  // ── Adjust balance (sesuaikan saldo) ────────────
  if (b.action === "adjust") {
    const accountId = Number(b.accountId);
    if (!Number.isFinite(accountId) || accountId <= 0) {
      return NextResponse.json({ error: "accountId tidak valid" }, { status: 400 });
    }
    const amount = parseSafeNumber(b.amount, { allowNegative: true, default: 0 });
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: "Amount harus non-zero" }, { status: 400 });
    }

    // F-03: atomic — fetch + update + insert mutation in single tx
    return await runTransaction(async (tx) => {
      const [acc] = await tx.select().from(accounts).where(eq(accounts.id, accountId));
      if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

      const newBalance = Number(acc.balance) + amount;

      await tx.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, accountId));
      await tx.insert(accountMutations).values({
        accountId,
        type: b.type || b.mutationType || "adjustment",
        amount,
        balanceAfter: newBalance,
        notes: b.notes ? String(b.notes) : null,
        referenceId: b.referenceId || null,
      });
      return NextResponse.json({ success: true, newBalance });
    });
  }

  // ── Transfer between accounts ───────────────────
  if (b.action === "transfer") {
    const fromId = Number(b.fromAccountId);
    const toId = Number(b.toAccountId);
    const amount = parseSafeNumber(b.amount, { default: 0, min: 1 });
    if (!Number.isFinite(fromId) || fromId <= 0 || !Number.isFinite(toId) || toId <= 0) {
      return NextResponse.json({ error: "accountId tidak valid" }, { status: 400 });
    }
    if (fromId === toId) {
      return NextResponse.json({ error: "Tidak bisa transfer ke rekening yang sama" }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
    }

    // F-03: atomic transfer with conditional balance check
    return await runTransaction(async (tx) => {
      const [fromAcc] = await tx.select().from(accounts).where(eq(accounts.id, fromId));
      const [toAcc] = await tx.select().from(accounts).where(eq(accounts.id, toId));
      if (!fromAcc || !toAcc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

      // F-02: conditional debit — only succeeds if balance >= amount
      const newFromBalance = Number(fromAcc.balance) - amount;
      const result = await tx.update(accounts)
        .set({ balance: newFromBalance, updatedAt: new Date() })
        .where(sql`${accounts.id} = ${fromId} AND ${accounts.balance} >= ${amount}`)
        .returning({ id: accounts.id });
      if (result.length === 0) {
        return NextResponse.json({
          error: `Saldo ${fromAcc.name} tidak cukup. Saldo: Rp${Number(fromAcc.balance).toLocaleString("id-ID")}`,
          code: "INSUFFICIENT_BALANCE",
        }, { status: 400 });
      }

      const newToBalance = Number(toAcc.balance) + amount;
      await tx.update(accounts).set({ balance: newToBalance, updatedAt: new Date() }).where(eq(accounts.id, toId));
      await tx.insert(accountMutations).values([
        { accountId: fromId, type: "transfer_out", amount: -amount, balanceAfter: newFromBalance, notes: b.notes ? String(b.notes) : `Transfer ke ${toAcc.name}` },
        { accountId: toId, type: "transfer_in", amount, balanceAfter: newToBalance, notes: b.notes ? String(b.notes) : `Transfer dari ${fromAcc.name}` },
      ]);
      return NextResponse.json({ success: true });
    });
  }

  // ── Update account (edit nama, icon, isActive, dll) ──
  if (b.action === "update") {
    const id = Number(b.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    }
    // P0: Allow updating isActive (for setup wizard activation)
    const updateData: Record<string, unknown> = {
      name: String(b.name || ""),
      icon: b.icon,
      color: b.color,
      minBalance: parseSafeNumber(b.minBalance, { default: 0, min: 0 }),
      updatedAt: new Date(),
    };
    if (b.isActive !== undefined) {
      updateData.isActive = b.isActive !== false;
    }
    const [acc] = await db.update(accounts).set(updateData).where(eq(accounts.id, id)).returning();
    return NextResponse.json(acc);
  }

  // ── Delete account (soft delete = nonaktifkan) ──
  if (b.action === "delete") {
    const id = Number(b.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
    }
    // F-07: prevent deleting cash account
    const [acc] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!acc) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }
    if (acc.code === "cash") {
      return NextResponse.json({ error: "Akun Kas Tunai tidak bisa dinonaktifkan" }, { status: 400 });
    }
    // P0: Prevent deactivation if account has non-zero balance
    const balance = Number(acc.balance);
    if (Math.abs(balance) > 0.01) {
      return NextResponse.json({
        error: `Tidak bisa menonaktifkan rekening dengan saldo Rp${balance.toLocaleString("id-ID")}. Pindahkan atau sesuaikan saldo terlebih dahulu.`,
        code: "NONZERO_BALANCE",
        balance,
      }, { status: 400 });
    }
    await db.update(accounts).set({ isActive: false, updatedAt: new Date() }).where(eq(accounts.id, id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// PUT handler — handle create/update/delete via PUT (untuk kompatibilitas Cash.tsx)
export async function PUT(req: Request) {
  return POST(req);
}
