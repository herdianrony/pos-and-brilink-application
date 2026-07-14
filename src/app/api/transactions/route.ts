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
    // POS TRANSACTION — M-01: Atomic operation
    return await runTransaction(async (tx) => {
    const invoiceNo = generateInvoice("POS");
    const items: Array<{
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      buyPrice: number;
    }> = body.items;

    // H-01: Validasi qty positive + server-authoritative price calculation
    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: "Quantity harus positif" }, { status: 400 });
      }
      const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!product) {
        return NextResponse.json({ error: `Produk ID ${item.productId} tidak ditemukan` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Stok ${product.name} tidak cukup` }, { status: 400 });
      }
      item.unitPrice = Number(product.sellPrice);
      item.buyPrice = Number(product.buyPrice);
      item.productName = product.name;
      item.subtotal = item.unitPrice * item.quantity;
    }

    let totalAmount = 0;
    let totalProfit = 0;
    for (const item of items) {
      totalAmount += item.subtotal;
      totalProfit += (item.unitPrice - item.buyPrice) * item.quantity;
    }

    const clientTotal = Number(body.totalAmount);
    if (!Number.isFinite(clientTotal) || clientTotal > totalAmount) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
    }
    const finalTotal = clientTotal;

    const [trx] = await tx.insert(transactions).values({
      invoiceNo,
      type: "pos",
      customerName: body.customerName || null,
      totalAmount: finalTotal,
      profit: totalProfit,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || null,
    }).returning();

    for (const item of items) {
      await tx.insert(transactionItems).values({
        transactionId: trx.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      });
      await tx.update(products).set({
        stock: sql`${products.stock} - ${item.quantity}`,
      }).where(eq(products.id, item.productId));
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