import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
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
    // POS TRANSACTION
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
      // Fetch real product data from DB (don't trust client prices)
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!product) {
        return NextResponse.json({ error: `Produk ID ${item.productId} tidak ditemukan` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Stok ${product.name} tidak cukup` }, { status: 400 });
      }
      // Override client values with server-authoritative values
      item.unitPrice = Number(product.sellPrice);
      item.buyPrice = Number(product.buyPrice);
      item.productName = product.name;
      item.subtotal = item.unitPrice * item.quantity;
    }

    // Server-authoritative total & profit
    let totalAmount = 0;
    let totalProfit = 0;
    for (const item of items) {
      totalAmount += item.subtotal;
      totalProfit += (item.unitPrice - item.buyPrice) * item.quantity;
    }

    // H-01: Validate totalAmount from client matches server calc (tolerance for discount)
    const clientTotal = Number(body.totalAmount);
    if (!Number.isFinite(clientTotal) || clientTotal > totalAmount) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
    }
    // Use server-calculated total (client may have discount applied)
    const finalTotal = clientTotal; // client sends post-discount total

    const [trx] = await db.insert(transactions).values({
      invoiceNo,
      type: "pos",
      customerName: body.customerName || null,
      totalAmount: finalTotal,
      profit: totalProfit,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || null,
    }).returning();

    for (const item of items) {
      await db.insert(transactionItems).values({
        transactionId: trx.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      });
      await db.update(products).set({
        stock: sql`${products.stock} - ${item.quantity}`,
      }).where(eq(products.id, item.productId));
    }

    // Update cash account (POS = cash in)
    if (cashAcc && body.paymentMethod === "cash") {
      await updateAccountBalance(cashAcc.id, finalTotal, "pos", `POS: ${invoiceNo}`, trx.id);
    }

    return NextResponse.json(trx);
  } else {
    // BRILINK TRANSACTION
    const invoiceNo = generateInvoice("BRL");
    
    // Get service details
    const [service] = body.serviceId 
      ? await db.select().from(brilinkServices).where(eq(brilinkServices.id, body.serviceId))
      : [];
    
    const cashEffect = body.cashEffect || service?.cashEffect || "in";
    const bankEffect = body.bankEffect || service?.bankEffect || "out";
    
    const totalAmount = Number(body.totalAmount);
    const adminFee = Number(body.adminFee || "0");
    const agentFee = Number(body.agentFee || body.adminFee || "0");
    
    const [trx] = await db.insert(transactions).values({
      invoiceNo,
      type: "brilink",
      subType: body.subType,
      customerName: body.customerName || null,
      customerPhone: body.customerPhone || null,
      totalAmount,
      adminFee,
      profit: agentFee,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || null,
    }).returning();

    // Total yang diterima/dikeluarkan = nominal + admin fee
    const totalCashFlow = totalAmount + adminFee;
    
    // Cash account effect
    if (cashAcc) {
      if (cashEffect === "in") {
        // Cash masuk (nasabah bayar cash)
        await updateAccountBalance(cashAcc.id, totalCashFlow, "brilink", `BRILink IN: ${body.subType} - ${invoiceNo}`, trx.id);
      } else if (cashEffect === "out") {
        // Cash keluar (kasih cash ke nasabah)
        await updateAccountBalance(cashAcc.id, -totalAmount, "brilink", `BRILink OUT: ${body.subType} - ${invoiceNo}`, trx.id);
        // Admin fee tetap masuk kas
        if (adminFee > 0) {
          await updateAccountBalance(cashAcc.id, adminFee, "brilink_fee", `Fee: ${body.subType}`, trx.id);
        }
      }
    }
    
    // Bank account effect - use selected bank account
    // Support multiple bank accounts (BRI, Mandiri, BCA, BNI, etc.)
    let bankAccId = body.bankAccountId;
    if (!bankAccId) {
      // Fallback to default BRI
      const defaultBank = await getAccountByCode("bank_bri");
      bankAccId = defaultBank?.id;
    }
    
    if (bankAccId && bankEffect !== "none") {
      const [bankAcc] = await db.select().from(accounts).where(eq(accounts.id, bankAccId));
      if (bankAcc) {
        if (bankEffect === "in") {
          // Saldo mbanking masuk (dari rekening nasabah via transfer)
          await updateAccountBalance(bankAcc.id, totalAmount, "brilink", `BRILink IN: ${body.subType} → ${bankAcc.name} - ${invoiceNo}`, trx.id);
        } else if (bankEffect === "out") {
          // Saldo mbanking keluar (agen transfer/bayar via mbanking)
          await updateAccountBalance(bankAcc.id, -totalAmount, "brilink", `BRILink OUT: ${body.subType} ← ${bankAcc.name} - ${invoiceNo}`, trx.id);
        }
      }
    }

    return NextResponse.json(trx);
  }
}