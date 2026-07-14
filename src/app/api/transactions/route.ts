import { NextRequest, NextResponse } from "next/server";
import { db, runTransaction } from "@/db";
import { transactions, transactionItems, products, accounts, accountMutations, brilinkServices } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { generateInvoice } from "@/lib/utils";
import { requireAuth } from "@/lib/auth";

async function getAccountByCode(code: string) {
  const [acc] = await db.select().from(accounts).where(eq(accounts.code, code));
  return acc;
}

async function updateAccountBalance(accountId: number, amount: number, type: string, notes: string, referenceId?: number) {
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!acc) return;
  
  const newBalance = Number(acc.balance) + amount;
  await db.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, accountId));
  await db.insert(accountMutations).values({
    accountId,
    type,
    amount,
    balanceAfter: newBalance,
    notes,
    referenceId,
  });
}


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const limit = parseInt(sp.get("limit") || "50");

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

  // Get cash account
  const cashAcc = await getAccountByCode("cash");

  if (body.type === "pos") {
    // POS TRANSACTION — R-01: Server-authoritative, R-02: Atomic
    return await runTransaction(async (tx) => {
    const invoiceNo = generateInvoice("POS");

    // R-01: Validate items exist and are array
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Items tidak valid" }, { status: 400 });
    }

    // R-01: Aggregate qty per productId (prevent duplicate line item bypass)
    const aggregated: Map<number, number> = new Map();
    for (const raw of body.items) {
      const qty = Number(raw.quantity);
      // R-01: Must be positive integer
      if (!Number.isInteger(qty) || qty <= 0) {
        return NextResponse.json({ error: "Quantity harus integer positif" }, { status: 400 });
      }
      const pid = Number(raw.productId);
      if (!Number.isInteger(pid) || pid <= 0) {
        return NextResponse.json({ error: "Product ID tidak valid" }, { status: 400 });
      }
      aggregated.set(pid, (aggregated.get(pid) || 0) + qty);
    }

    // R-01: Fetch products from DB, validate stock with AGGREGATED qty
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
      // R-01: Check aggregated qty against stock
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

    // R-01: Server-authoritative total & profit (ignore client values)
    let totalAmount = 0;
    let totalProfit = 0;
    for (const item of serverItems) {
      totalAmount += item.subtotal;
      totalProfit += (item.unitPrice - item.buyPrice) * item.quantity;
    }

    // R-01: Server-side discount calculation
    let discount = 0;
    if (body.discount && Number.isFinite(Number(body.discount)) && Number(body.discount) > 0) {
      discount = Math.min(Number(body.discount), totalAmount); // Cap at total
    }
    const finalTotal = totalAmount - discount;

    const [trx] = await tx.insert(transactions).values({
      invoiceNo,
      type: "pos",
      customerName: body.customerName || null,
      totalAmount: finalTotal,
      profit: totalProfit,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || null,
    }).returning();

    // R-01: Conditional stock decrement — only if rows affected
    for (const item of serverItems) {
      await tx.insert(transactionItems).values({
        transactionId: trx.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      });
      // R-01: Conditional update — only decrement if stock >= qty
      const result = await tx.update(products).set({
        stock: sql`${products.stock} - ${item.quantity}`,
      }).where(sql`${products.id} = ${item.productId} AND ${products.stock} >= ${item.quantity}`).returning({ id: products.id });

      // R-01: If no row updated, stock was insufficient (race condition)
      if (result.length === 0) {
        throw new Error(`Stok race condition: produk ID ${item.productId} tidak cukup`);
      }
    }

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
    }); // end runTransaction
  } else {
    // BRILINK TRANSACTION — M-01: Atomic + H-01: Server-authoritative
    return await runTransaction(async (tx) => {
    const invoiceNo = generateInvoice("BRL");

    // H-01: Fetch service from DB (don't trust client)
    const [service] = body.serviceId
      ? await tx.select().from(brilinkServices).where(eq(brilinkServices.id, body.serviceId))
      : [];

    if (!service) {
      return NextResponse.json({ error: "Layanan tidak ditemukan" }, { status: 400 });
    }

    // H-01: Use service values from DB, not client
    const cashEffect = service.cashEffect;
    const bankEffect = service.bankEffect;

    const totalAmount = Number(body.totalAmount);
    // H-01: Validate amount
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
    }

    // H-01: Get fee from DB, not client
    let adminFee = Number(service.adminFee);
    let agentFee = Number(service.agentFee);
    // TODO: Check fee tiers if useTieredFee

    const [trx] = await tx.insert(transactions).values({
      invoiceNo,
      type: "brilink",
      subType: body.subType || service.name,
      customerName: body.customerName || null,
      customerPhone: body.customerPhone || null,
      totalAmount,
      adminFee,
      profit: agentFee,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || null,
    }).returning();

    const totalCashFlow = totalAmount + adminFee;

    // Cash account effect
    if (cashAcc) {
      if (cashEffect === "in") {
        const newBalance = cashAcc.balance + totalCashFlow;
        await tx.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, cashAcc.id));
        await tx.insert(accountMutations).values({
          accountId: cashAcc.id, type: "brilink_in", amount: totalCashFlow, balanceAfter: newBalance,
          notes: `BRILink IN: ${service.name} - ${invoiceNo}`, referenceId: trx.id,
        });
      } else if (cashEffect === "out") {
        const newBalance = cashAcc.balance - totalAmount;
        await tx.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, cashAcc.id));
        await tx.insert(accountMutations).values({
          accountId: cashAcc.id, type: "brilink_out", amount: -totalAmount, balanceAfter: newBalance,
          notes: `BRILink OUT: ${service.name} - ${invoiceNo}`, referenceId: trx.id,
        });
        if (adminFee > 0) {
          const feeBalance = newBalance + adminFee;
          await tx.update(accounts).set({ balance: feeBalance, updatedAt: new Date() }).where(eq(accounts.id, cashAcc.id));
          await tx.insert(accountMutations).values({
            accountId: cashAcc.id, type: "brilink_fee", amount: adminFee, balanceAfter: feeBalance,
            notes: `Fee: ${service.name}`, referenceId: trx.id,
          });
        }
      }
    }

    // Bank account effect
    let bankAccId = body.bankAccountId;
    if (!bankAccId) {
      const defaultBank = await getAccountByCode("bank_bri");
      bankAccId = defaultBank?.id;
    }

    if (bankAccId && bankEffect !== "none") {
      const [bankAcc] = await tx.select().from(accounts).where(eq(accounts.id, bankAccId));
      if (bankAcc) {
        if (bankEffect === "in") {
          const newBalance = bankAcc.balance + totalAmount;
          await tx.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, bankAcc.id));
          await tx.insert(accountMutations).values({
            accountId: bankAcc.id, type: "brilink_in", amount: totalAmount, balanceAfter: newBalance,
            notes: `BRILink IN: ${service.name} → ${bankAcc.name} - ${invoiceNo}`, referenceId: trx.id,
          });
        } else if (bankEffect === "out") {
          const newBalance = bankAcc.balance - totalAmount;
          await tx.update(accounts).set({ balance: newBalance, updatedAt: new Date() }).where(eq(accounts.id, bankAcc.id));
          await tx.insert(accountMutations).values({
            accountId: bankAcc.id, type: "brilink_out", amount: -totalAmount, balanceAfter: newBalance,
            notes: `BRILink OUT: ${service.name} ← ${bankAcc.name} - ${invoiceNo}`, referenceId: trx.id,
          });
        }
      }
    }

    return NextResponse.json(trx);
    }); // end runTransaction
  }
}