import { NextRequest, NextResponse } from "next/server";
import { db, runTransaction } from "@/db";
import {
  transactions,
  transactionItems,
  accounts,
  accountMutations,
  transactionDenominations,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/transactions/[id] — fetch single transaction with items + denominations
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const [trx] = await db.select().from(transactions).where(eq(transactions.id, parseInt(id)));
  if (!trx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, trx.id));
  const denoms = await db.select().from(transactionDenominations).where(eq(transactionDenominations.transactionId, trx.id));
  return NextResponse.json({ ...trx, items, denominations: denoms });
}

// ── P2: PATCH /api/transactions/[id] — update status lifecycle ──
//
// Actions:
//   { action: "complete", referenceNo: "TRX123" }
//     → pending → completed (kasir mengisi nomor referensi provider)
//
//   { action: "void", reason: "Salah nominal" }
//     → pending → void (admin batalkan, saldo tidak berubah karena belum completed)
//
//   { action: "reverse", reason: "Transfer gagal di provider" }
//     → completed → reversed (admin reverse, buat counter-mutation untuk kembalikan saldo)
//
// Enforcements:
//   - require_transaction_reference: jika true, complete wajib referenceNo
//   - void hanya untuk status=pending
//   - reverse hanya untuk status=completed
//   - void/reverse wajib admin

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const trxId = parseInt(id);
  if (!Number.isFinite(trxId) || trxId <= 0) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  // Fetch the transaction
  const [trx] = await db.select().from(transactions).where(eq(transactions.id, trxId));
  if (!trx) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  // ── Action: complete (pending → completed) ──
  if (action === "complete") {
    // P2: Check require_transaction_reference setting
    const { settings } = await import("@/db/schema");
    const [refSetting] = await db.select().from(settings).where(eq(settings.key, "require_transaction_reference")).limit(1);
    const requireRef = refSetting?.value === "true";

    const referenceNo = String(body.referenceNo || "").trim();
    if (requireRef && !referenceNo) {
      return NextResponse.json({
        error: "Nomor referensi wajib diisi untuk menyelesaikan transaksi ini",
        code: "REFERENCE_REQUIRED",
      }, { status: 400 });
    }

    if (trx.status !== "pending") {
      return NextResponse.json({
        error: `Transaksi tidak bisa diselesaikan (status saat ini: ${trx.status})`,
        code: "INVALID_STATUS",
      }, { status: 400 });
    }

    const [updated] = await db.update(transactions).set({
      status: "completed",
      referenceNo: referenceNo || trx.referenceNo,
      confirmedAt: new Date(),
      confirmedByUserId: auth.user.id,
    }).where(eq(transactions.id, trxId)).returning();

    return NextResponse.json(updated);
  }

  // ── Action: void (pending → void) ──
  // Void hanya untuk pending. Saldo belum berubah karena transaksi belum completed.
  if (action === "void") {
    // Void requires admin
    const adminAuth = await requireAdmin();
    if (!adminAuth.ok) return adminAuth.response;

    const reason = String(body.reason || "").trim();
    if (!reason || reason.length < 3) {
      return NextResponse.json({
        error: "Alasan void wajib diisi (min 3 karakter)",
        code: "REASON_REQUIRED",
      }, { status: 400 });
    }

    if (trx.status !== "pending") {
      return NextResponse.json({
        error: `Void hanya untuk transaksi pending (status saat ini: ${trx.status}). Gunakan reverse untuk transaksi completed.`,
        code: "INVALID_STATUS",
      }, { status: 400 });
    }

    const [updated] = await db.update(transactions).set({
      status: "void",
      notes: trx.notes ? `${trx.notes} | VOID: ${reason}` : `VOID: ${reason}`,
      confirmedAt: new Date(),
      confirmedByUserId: auth.user.id,
    }).where(eq(transactions.id, trxId)).returning();

    return NextResponse.json(updated);
  }

  // ── Action: reverse (completed → reversed) ──
  // Reverse membuat counter-mutation untuk mengembalikan saldo.
  // Saldo historis TIDAK diubah — reversal dicatat sebagai mutasi baru.
  if (action === "reverse") {
    const adminAuth = await requireAdmin();
    if (!adminAuth.ok) return adminAuth.response;

    const reason = String(body.reason || "").trim();
    if (!reason || reason.length < 3) {
      return NextResponse.json({
        error: "Alasan reverse wajib diisi (min 3 karakter)",
        code: "REASON_REQUIRED",
      }, { status: 400 });
    }

    if (trx.status !== "completed") {
      return NextResponse.json({
        error: `Reverse hanya untuk transaksi completed (status saat ini: ${trx.status})`,
        code: "INVALID_STATUS",
      }, { status: 400 });
    }

    // P2: Atomic reversal — update status + create counter-mutations
    return await runTransaction(async (tx) => {
      // Update transaction status
      const [updated] = await tx.update(transactions).set({
        status: "reversed",
        notes: trx.notes ? `${trx.notes} | REVERSED: ${reason}` : `REVERSED: ${reason}`,
        confirmedAt: new Date(),
        confirmedByUserId: auth.user.id,
      }).where(eq(transactions.id, trxId)).returning();

      // Create counter-mutations to reverse the cash/bank effects
      // Find the original mutations for this transaction
      const originalMutations = await tx.select().from(accountMutations)
        .where(eq(accountMutations.referenceId, trxId));

      // For each original mutation, create a counter-mutation with opposite sign
      for (const mut of originalMutations) {
        const [acc] = await tx.select().from(accounts).where(eq(accounts.id, mut.accountId));
        if (!acc) continue;

        // Counter-mutation: opposite amount
        const counterAmount = -mut.amount;
        const newBalance = Number(acc.balance) + counterAmount;

        await tx.update(accounts)
          .set({ balance: newBalance, updatedAt: new Date() })
          .where(eq(accounts.id, acc.id));
        await tx.insert(accountMutations).values({
          accountId: acc.id,
          type: `${mut.type}_reversal`,
          amount: counterAmount,
          balanceAfter: newBalance,
          notes: `REVERSAL: ${reason} (ref: ${trx.invoiceNo})`,
          referenceId: trxId,
        });
      }

      return NextResponse.json(updated);
    });
  }

  return NextResponse.json({ error: "Invalid action. Use: complete, void, or reverse" }, { status: 400 });
}
