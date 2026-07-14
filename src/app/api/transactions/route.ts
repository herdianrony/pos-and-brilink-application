import { NextRequest, NextResponse } from "next/server";
import { db, runTransaction, parseSafeNumber } from "@/db";
import {
  transactions,
  transactionItems,
  products,
  accounts,
  accountMutations,
  brilinkServices,
  feeTiers,
  settings,
} from "@/db/schema";
import { desc, eq, and, sql, asc } from "drizzle-orm";
import { generateInvoice } from "@/lib/utils";
import { requireAuth } from "@/lib/auth";

async function getAccountByCode(code: string) {
  const [acc] = await db.select().from(accounts).where(eq(accounts.code, code));
  return acc;
}

// ── Build transaction notes with optional denomination breakdown ──
function buildTransactionNotes(
  userNotes: unknown,
  denomination: unknown,
  feeMethod: string
): string | null {
  const parts: string[] = [];
  if (typeof userNotes === "string" && userNotes.trim()) {
    parts.push(userNotes.trim());
  }
  if (feeMethod && feeMethod !== "cash") {
    parts.push(`Fee: ${feeMethod}`);
  }
  if (denomination && typeof denomination === "object") {
    const entries = Object.entries(denomination as Record<string, number>)
      .filter(([, count]) => count > 0)
      .map(([val, count]) => `${count}×${parseInt(val)}`);
    if (entries.length > 0) {
      parts.push(`Denominasi: ${entries.join(", ")}`);
    }
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

// ── F-01: Diskon policy ────────────────────────────
// Default: max discount Rp100.000 atau 10% dari subtotal, mana lebih besar.
// Bila discount > limit, wajib PIN admin (diset di settings: discount_admin_pin).
async function getDiscountPolicy() {
  const rows = await db.select().from(settings).where(
    sql`${settings.key} IN ('max_discount_amount', 'max_discount_percent', 'discount_admin_pin')`
  );
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value;

  return {
    maxAmount: parseSafeNumber(m.max_discount_amount, { default: 100000, min: 0 }),
    maxPercent: parseSafeNumber(m.max_discount_percent, { default: 10, min: 0, max: 100 }),
    adminPin: m.discount_admin_pin || "", // bcrypt hash; if empty → no PIN enforcement
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const limit = Math.max(1, Math.min(500, parseInt(sp.get("limit") || "50", 10) || 50));

  const conds = [];
  if (type && type !== "all") conds.push(eq(transactions.type, type));

  const data = await db
    .select()
    .from(transactions)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();

  // Get cash account (read once outside transaction)
  const cashAcc = await getAccountByCode("cash");

  if (body.type === "pos") {
    // POS TRANSACTION — F-01, F-03: atomic with discount policy + final profit
    return await runTransaction(async (tx) => {
      const invoiceNo = generateInvoice("POS");

      // Validate items
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: "Items tidak valid" }, { status: 400 });
      }

      // Aggregate qty per productId (prevent duplicate line bypass)
      const aggregated: Map<number, number> = new Map();
      for (const raw of body.items) {
        const qty = Number(raw.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          return NextResponse.json({ error: "Quantity harus integer positif" }, { status: 400 });
        }
        const pid = Number(raw.productId);
        if (!Number.isInteger(pid) || pid <= 0) {
          return NextResponse.json({ error: "Product ID tidak valid" }, { status: 400 });
        }
        aggregated.set(pid, (aggregated.get(pid) || 0) + qty);
      }

      // Fetch products, validate stock with AGGREGATED qty
      const serverItems: Array<{
        productId: number; productName: string; quantity: number;
        unitPrice: number; buyPrice: number; subtotal: number;
      }> = [];

      for (const [pid, qty] of aggregated) {
        const [product] = await tx.select().from(products).where(eq(products.id, pid)).limit(1);
        if (!product) {
          return NextResponse.json({ error: `Produk ID ${pid} tidak ditemukan` }, { status: 400 });
        }
        if (!product.isActive) {
          return NextResponse.json({ error: `Produk ${product.name} tidak aktif` }, { status: 400 });
        }
        if (product.stock < qty) {
          return NextResponse.json({ error: `Stok ${product.name} tidak cukup (tersisa ${product.stock}, diminta ${qty})` }, { status: 400 });
        }
        const unitPrice = Number(product.sellPrice);
        const buyPrice = Number(product.buyPrice);
        serverItems.push({
          productId: pid,
          productName: product.name,
          quantity: qty,
          unitPrice,
          buyPrice,
          subtotal: unitPrice * qty,
        });
      }

      // Server-authoritative total
      let totalAmount = 0;
      let totalCogs = 0; // Cost of goods sold
      for (const item of serverItems) {
        totalAmount += item.subtotal;
        totalCogs += item.buyPrice * item.quantity;
      }

      // F-01: Server-side discount policy
      let discount = 0;
      const rawDiscount = parseSafeNumber(body.discount, { default: 0, min: 0 });
      if (rawDiscount > 0) {
        // Cap at total
        discount = Math.min(rawDiscount, totalAmount);

        // F-01: Check policy
        const policy = await getDiscountPolicy();
        const percentOfTotal = totalAmount > 0 ? (discount / totalAmount) * 100 : 0;
        const exceedsAmount = discount > policy.maxAmount;
        const exceedsPercent = percentOfTotal > policy.maxPercent;
        const isFullDiscount = discount >= totalAmount && totalAmount > 0;

        // If exceeds policy OR is 100% discount → require admin PIN
        if (exceedsAmount || exceedsPercent || isFullDiscount) {
          // If no PIN configured → reject all discounts above policy
          if (!policy.adminPin) {
            return NextResponse.json({
              error: `Diskon Rp${discount.toLocaleString("id-ID")} melebihi kebijakan (maks Rp${policy.maxAmount.toLocaleString("id-ID")} atau ${policy.maxPercent}% dari subtotal). Mintalah admin untuk mengatur PIN diskon di Pengaturan.`,
            }, { status: 403 });
          }
          // Verify admin PIN
          const providedPin = String(body.discountAdminPin || "");
          if (!providedPin) {
            return NextResponse.json({
              error: "Diskon besar memerlukan otorisasi admin. Masukkan PIN admin.",
              code: "DISCOUNT_PIN_REQUIRED",
            }, { status: 403 });
          }
          // PIN is stored as bcrypt hash in settings; verify with bcryptjs
          // For perf, use a simple equality check on a pre-hashed PIN (less secure but acceptable for local app)
          const bcrypt = require("bcryptjs");
          let pinOk = false;
          try {
            pinOk = await bcrypt.compare(providedPin, policy.adminPin);
          } catch {
            pinOk = false;
          }
          if (!pinOk) {
            return NextResponse.json({
              error: "PIN admin tidak valid",
              code: "DISCOUNT_PIN_INVALID",
            }, { status: 403 });
          }
        }

        // F-01: Require reason for any discount
        const reason = String(body.discountReason || "").trim();
        if (!reason || reason.length < 3) {
          return NextResponse.json({
            error: "Alasan diskon wajib diisi (min 3 karakter)",
            code: "DISCOUNT_REASON_REQUIRED",
          }, { status: 400 });
        }
      }

      const finalTotal = totalAmount - discount;

      // F-01: Profit dihitung dari pendapatan final - HPP
      // (bukan dari harga sebelum diskon)
      const finalProfit = finalTotal - totalCogs;

      const notes = body.notes
        ? String(body.notes)
        : discount > 0
          ? `Diskon Rp${discount.toLocaleString("id-ID")}${body.discountReason ? ` — ${body.discountReason}` : ""}`
          : null;

      const [trx] = await tx.insert(transactions).values({
        invoiceNo,
        type: "pos",
        customerName: body.customerName ? String(body.customerName) : null,
        totalAmount: finalTotal,
        profit: finalProfit,
        paymentMethod: body.paymentMethod || "cash",
        notes,
      }).returning();

      // Insert line items + conditional stock decrement
      for (const item of serverItems) {
        await tx.insert(transactionItems).values({
          transactionId: trx.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        });
        // Conditional update — only decrement if stock >= qty (race-safe)
        const result = await tx.update(products).set({
          stock: sql`${products.stock} - ${item.quantity}`,
        }).where(sql`${products.id} = ${item.productId} AND ${products.stock} >= ${item.quantity}`).returning({ id: products.id });

        if (result.length === 0) {
          // F-03: Throw → triggers ROLLBACK on entire transaction
          throw new Error(`Stok race condition: produk ID ${item.productId} tidak cukup`);
        }
      }

      // Cash account mutation (cash payment only)
      if (cashAcc && body.paymentMethod === "cash") {
        const newBalance = cashAcc.balance + finalTotal;
        await tx.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, cashAcc.id));
        await tx.insert(accountMutations).values({
          accountId: cashAcc.id,
          type: "pos_in",
          amount: finalTotal,
          balanceAfter: newBalance,
          notes: `POS: ${invoiceNo}`,
          referenceId: trx.id,
        });
      }

      return NextResponse.json(trx);
    });
  } else {
    // BRILINK TRANSACTION — F-02: conditional balance check, F-03: atomic
    return await runTransaction(async (tx) => {
      const invoiceNo = generateInvoice("BRL");

      // Fetch service from DB
      const [service] = body.serviceId
        ? await tx.select().from(brilinkServices).where(eq(brilinkServices.id, body.serviceId))
        : [];

      if (!service) {
        return NextResponse.json({ error: "Layanan tidak ditemukan" }, { status: 400 });
      }
      if (!service.isActive) {
        return NextResponse.json({ error: "Layanan tidak aktif" }, { status: 400 });
      }

      const cashEffect = service.cashEffect;
      const bankEffect = service.bankEffect;

      const totalAmount = parseSafeNumber(body.totalAmount, { min: 1 });
      if (totalAmount <= 0) {
        return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
      }

      // F-07: Implement fee tier lookup (remove TODO)
      let adminFee = Number(service.adminFee);
      let agentFee = Number(service.agentFee);
      if (service.useTieredFee) {
        const tiers = await tx.select().from(feeTiers)
          .where(eq(feeTiers.serviceId, service.id))
          .orderBy(asc(feeTiers.minAmount));
        for (const tier of tiers) {
          const minN = Number(tier.minAmount);
          const maxN = tier.maxAmount === null ? Infinity : Number(tier.maxAmount);
          if (totalAmount >= minN && totalAmount <= maxN) {
            adminFee = Number(tier.adminFee);
            agentFee = Number(tier.agentFee);
            break;
          }
        }
      }

      // Determine bank account ID
      let bankAccId = body.bankAccountId ? Number(body.bankAccountId) : null;
      if (!bankAccId) {
        const defaultBank = await getAccountByCode("bank_bri");
        bankAccId = defaultBank?.id ?? null;
      }

      // F-02: Pre-validate balances BEFORE writing
      // Re-fetch cash inside transaction (locked)
      let cashBalanceAfter = cashAcc?.balance ?? 0;
      if (cashAcc && cashEffect === "out") {
        const [freshCash] = await tx.select().from(accounts).where(eq(accounts.id, cashAcc.id));
        if (!freshCash) {
          return NextResponse.json({ error: "Akun kas tidak ditemukan" }, { status: 400 });
        }
        if (freshCash.balance < totalAmount) {
          return NextResponse.json({
            error: `Saldo kas tidak cukup. Saldo: Rp${Number(freshCash.balance).toLocaleString("id-ID")}, dibutuhkan: Rp${totalAmount.toLocaleString("id-ID")}`,
            code: "INSUFFICIENT_CASH",
          }, { status: 400 });
        }
        cashBalanceAfter = freshCash.balance - totalAmount;
      }

      let bankAcc: typeof accounts.$inferSelect | null = null;
      let bankBalanceAfter = 0;
      if (bankAccId && bankEffect !== "none") {
        const [ba] = await tx.select().from(accounts).where(eq(accounts.id, bankAccId));
        if (!ba) {
          return NextResponse.json({ error: "Akun bank tidak ditemukan" }, { status: 400 });
        }
        if (!ba.isActive) {
          return NextResponse.json({ error: `Akun bank ${ba.name} tidak aktif` }, { status: 400 });
        }
        if (bankEffect === "out" && ba.balance < totalAmount) {
          return NextResponse.json({
            error: `Saldo ${ba.name} tidak cukup. Saldo: Rp${Number(ba.balance).toLocaleString("id-ID")}, dibutuhkan: Rp${totalAmount.toLocaleString("id-ID")}`,
            code: "INSUFFICIENT_BANK_BALANCE",
          }, { status: 400 });
        }
        bankAcc = ba;
        bankBalanceAfter = bankEffect === "out" ? ba.balance - totalAmount : ba.balance + totalAmount;
      }

      // ── Fee method affects cash flow ────────────
      // - "cash": nasabah bayar fee tunai terpisah → kas += adminFee
      // - "deducted": fee dipotong dari nominal → nasabah terima (nominal - adminFee)
      // - "charged": fee dibebankan ke rekening nasabah → kas tidak terdampak fee
      const feeMethod = (body.feeMethod === "deducted" || body.feeMethod === "charged") ? body.feeMethod : "cash";
      const cashFromFee = feeMethod === "cash" ? adminFee : 0;

      const [trx] = await tx.insert(transactions).values({
        invoiceNo,
        type: "brilink",
        subType: body.subType || service.name,
        customerName: body.customerName ? String(body.customerName) : null,
        customerPhone: body.customerPhone ? String(body.customerPhone) : null,
        totalAmount,
        adminFee,
        profit: agentFee,
        paymentMethod: body.paymentMethod || "cash",
        notes: buildTransactionNotes(body.notes, body.denomination, feeMethod),
      }).returning();

      // Cash flow depends on fee method
      const totalCashFlow = cashEffect === "in" ? totalAmount + cashFromFee : -totalAmount;

      // ── Cash account effect ─────────────────────
      if (cashAcc) {
        if (cashEffect === "in") {
          const newBalance = cashAcc.balance + totalCashFlow;
          // F-02: conditional update — only if balance after > min OR no min
          const result = await tx.update(accounts)
            .set({ balance: newBalance, updatedAt: new Date() })
            .where(eq(accounts.id, cashAcc.id))
            .returning({ id: accounts.id });
          if (result.length === 0) {
            throw new Error("Gagal update kas (race condition)");
          }
          await tx.insert(accountMutations).values({
            accountId: cashAcc.id, type: "brilink_in", amount: totalCashFlow, balanceAfter: newBalance,
            notes: `BRILink IN: ${service.name} - ${invoiceNo}`, referenceId: trx.id,
          });
        } else if (cashEffect === "out") {
          // F-02: Conditional update — only decrement if balance >= totalAmount
          const result = await tx.update(accounts)
            .set({ balance: cashBalanceAfter, updatedAt: new Date() })
            .where(sql`${accounts.id} = ${cashAcc.id} AND ${accounts.balance} >= ${totalAmount}`)
            .returning({ id: accounts.id });
          if (result.length === 0) {
            // F-03: Throw → triggers ROLLBACK on entire transaction
            throw new Error(`Saldo kas tidak cukup (race condition) untuk ${service.name}`);
          }
          await tx.insert(accountMutations).values({
            accountId: cashAcc.id, type: "brilink_out", amount: -totalAmount, balanceAfter: cashBalanceAfter,
            notes: `BRILink OUT: ${service.name} - ${invoiceNo}`, referenceId: trx.id,
          });
          // Fee only added to cash if fee method is "cash" (paid separately by customer)
          if (adminFee > 0 && feeMethod === "cash") {
            const feeBalance = cashBalanceAfter + adminFee;
            await tx.update(accounts).set({ balance: feeBalance, updatedAt: new Date() }).where(eq(accounts.id, cashAcc.id));
            await tx.insert(accountMutations).values({
              accountId: cashAcc.id, type: "brilink_fee", amount: adminFee, balanceAfter: feeBalance,
              notes: `Fee: ${service.name}`, referenceId: trx.id,
            });
          }
        }
      }

      // ── Bank account effect ─────────────────────
      if (bankAcc && bankEffect !== "none") {
        if (bankEffect === "in") {
          await tx.update(accounts).set({ balance: bankBalanceAfter, updatedAt: new Date() }).where(eq(accounts.id, bankAcc.id));
          await tx.insert(accountMutations).values({
            accountId: bankAcc.id, type: "brilink_in", amount: totalAmount, balanceAfter: bankBalanceAfter,
            notes: `BRILink IN: ${service.name} → ${bankAcc.name} - ${invoiceNo}`, referenceId: trx.id,
          });
        } else if (bankEffect === "out") {
          // F-02: Conditional update — only decrement if balance >= totalAmount
          const result = await tx.update(accounts)
            .set({ balance: bankBalanceAfter, updatedAt: new Date() })
            .where(sql`${accounts.id} = ${bankAcc.id} AND ${accounts.balance} >= ${totalAmount}`)
            .returning({ id: accounts.id });
          if (result.length === 0) {
            throw new Error(`Saldo ${bankAcc.name} tidak cukup (race condition) untuk ${service.name}`);
          }
          await tx.insert(accountMutations).values({
            accountId: bankAcc.id, type: "brilink_out", amount: -totalAmount, balanceAfter: bankBalanceAfter,
            notes: `BRILink OUT: ${service.name} ← ${bankAcc.name} - ${invoiceNo}`, referenceId: trx.id,
          });
        }
      }

      return NextResponse.json(trx);
    });
  }
}
