import { NextResponse } from "next/server";
import { db, dbReady, runTransaction } from "@/db";
import {
  categories,
  products,
  feeTiers,
  brilinkServices,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Demo Data Endpoint ────────────────────────────
// Creates sample products + product categories + fee tiers for testing/demo.
// This is SEPARATE from the production seed (which only has system templates).
//
// Usage:
//   POST /api/seed-demo  → create demo data
//   DELETE /api/seed-demo → remove demo data
//
// This endpoint is dev/test only — guarded by requireAdmin in production.

export async function POST() {
  // Only allow in dev or authenticated (admin)
  if (process.env.NODE_ENV === "production") {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
  }
  try {
    await dbReady;

    const result = await runTransaction(async (tx) => {
      const stats: Record<string, number> = {};

      // ── Product Categories ──
      const existingCats = await tx.select().from(categories).limit(1);
      let cats: Array<{ id: number; name: string }> = [];
      if (existingCats.length === 0) {
        cats = await tx.insert(categories).values([
          { name: "Makanan", icon: "utensils", color: "#ef4444" },
          { name: "Minuman", icon: "cup-soda", color: "#3b82f6" },
          { name: "Rokok", icon: "package", color: "#6b7280" },
          { name: "Sembako", icon: "shopping-cart", color: "#22c55e" },
          { name: "Snack", icon: "cookie", color: "#f59e0b" },
          { name: "ATK", icon: "pencil", color: "#8b5cf6" },
          { name: "Toiletries", icon: "spray-can", color: "#ec4899" },
          { name: "Aksesoris HP", icon: "smartphone", color: "#06b6d4" },
          { name: "Pulsa & Voucher", icon: "smartphone", color: "#00875A" },
          { name: "Gas & Listrik", icon: "zap", color: "#f97316" },
        ]).returning({ id: categories.id, name: categories.name });
        stats.productCategories = cats.length;
      } else {
        stats.productCategories = 0;
      }

      const cm: Record<string, number> = {};
      for (const c of cats) cm[c.name] = c.id;
      if (cats.length === 0) {
        const allCats = await tx.select().from(categories);
        for (const c of allCats) cm[c.name] = c.id;
      }

      // ── Products ──
      const existingProducts = await tx.select().from(products).limit(1);
      if (existingProducts.length === 0) {
        await tx.insert(products).values([
          { name: "Indomie Goreng", barcode: "089686010947", categoryId: cm["Makanan"], buyPrice: 2500, sellPrice: 3500, stock: 120, minStock: 20, unit: "pcs" },
          { name: "Indomie Kuah Soto", barcode: "089686010602", categoryId: cm["Makanan"], buyPrice: 2500, sellPrice: 3500, stock: 80, minStock: 15, unit: "pcs" },
          { name: "Mie Sedaap Goreng", barcode: "089686040203", categoryId: cm["Makanan"], buyPrice: 2800, sellPrice: 3500, stock: 60, minStock: 10, unit: "pcs" },
          { name: "Aqua 600ml", barcode: "761100100019", categoryId: cm["Minuman"], buyPrice: 2800, sellPrice: 4000, stock: 200, minStock: 30, unit: "botol" },
          { name: "Teh Botol Sosro 450ml", barcode: "899900100219", categoryId: cm["Minuman"], buyPrice: 3500, sellPrice: 5000, stock: 48, minStock: 10, unit: "botol" },
          { name: "Le Minerale 600ml", barcode: "749100100012", categoryId: cm["Minuman"], buyPrice: 2200, sellPrice: 3500, stock: 150, minStock: 25, unit: "botol" },
          { name: "Coca Cola 390ml", barcode: "545500200100", categoryId: cm["Minuman"], buyPrice: 5500, sellPrice: 7500, stock: 36, minStock: 8, unit: "botol" },
          { name: "GG Surya 12", barcode: "899001010012", categoryId: cm["Rokok"], buyPrice: 20000, sellPrice: 24000, stock: 50, minStock: 10, unit: "bungkus" },
          { name: "Sampoerna Mild 16", barcode: "899001020016", categoryId: cm["Rokok"], buyPrice: 28000, sellPrice: 32000, stock: 40, minStock: 8, unit: "bungkus" },
          { name: "Djarum Super 12", barcode: "899001030012", categoryId: cm["Rokok"], buyPrice: 19000, sellPrice: 22000, stock: 35, minStock: 8, unit: "bungkus" },
          { name: "Beras Premium 5kg", categoryId: cm["Sembako"], buyPrice: 62000, sellPrice: 70000, stock: 25, minStock: 5, unit: "karung" },
        ]);
        stats.products = 11;
      } else {
        stats.products = 0;
      }

      // ── Fee Tiers (sample for tiered services) ──
      const svcs = await tx.select().from(brilinkServices);
      let tierCount = 0;
      for (const svc of svcs) {
        if (!svc.useTieredFee) continue;
        const existingTiers = await tx.select().from(feeTiers).where(eq(feeTiers.serviceId, svc.id));
        if (existingTiers.length > 0) continue;

        let tiers: Array<{ minAmount: number; maxAmount: number | null; adminFee: number; agentFee: number }> = [];
        if (svc.code === "transfer_cash") {
          tiers = [
            { minAmount: 0, maxAmount: 10000000, adminFee: 2500, agentFee: 2500 },
            { minAmount: 10000001, maxAmount: 50000000, adminFee: 5000, agentFee: 5000 },
            { minAmount: 50000001, maxAmount: null, adminFee: 10000, agentFee: 10000 },
          ];
        } else if (svc.code === "cash_withdrawal") {
          tiers = [
            { minAmount: 0, maxAmount: 1000000, adminFee: 2500, agentFee: 2500 },
            { minAmount: 1000001, maxAmount: 5000000, adminFee: 3500, agentFee: 3500 },
            { minAmount: 5000001, maxAmount: null, adminFee: 5000, agentFee: 5000 },
          ];
        } else if (svc.code === "cash_deposit") {
          tiers = [
            { minAmount: 0, maxAmount: 500000, adminFee: 3000, agentFee: 3000 },
            { minAmount: 500001, maxAmount: 2000000, adminFee: 5000, agentFee: 5000 },
            { minAmount: 2000001, maxAmount: 5000000, adminFee: 7500, agentFee: 7500 },
            { minAmount: 5000001, maxAmount: null, adminFee: 10000, agentFee: 10000 },
          ];
        } else if (svc.code?.startsWith("token_pln_")) {
          const codePart = svc.code.replace("token_pln_", "");
          const nominal = codePart === "1jt" ? 1000000 : parseInt(codePart.replace("k", "000"));
          if (nominal > 0) {
            const fee = nominal >= 500000 ? 3000 : nominal >= 100000 ? 2000 : 1500;
            tiers = [{ minAmount: nominal, maxAmount: nominal, adminFee: fee, agentFee: fee }];
          }
        } else if (svc.code?.startsWith("voucher_game_")) {
          const nominal = parseInt(svc.code.replace("voucher_game_", "").replace("k", "000"));
          if (nominal > 0) {
            const fee = nominal >= 330000 ? 3000 : nominal >= 132000 ? 2500 : nominal >= 66000 ? 2000 : nominal >= 33000 ? 1500 : 1000;
            tiers = [{ minAmount: nominal, maxAmount: nominal, adminFee: fee, agentFee: fee }];
          }
        }
        if (tiers.length > 0) {
          await tx.insert(feeTiers).values(tiers.map(t => ({ serviceId: svc.id, ...t })));
          tierCount += tiers.length;
        }
      }
      stats.feeTiers = tierCount;

      return stats;
    });

    return NextResponse.json({
      message: "Demo data created",
      stats: result,
      note: "Demo data berisi produk contoh + fee tiers. Hapus via DELETE /api/seed-demo.",
    });
  } catch (error) {
    console.error("Demo seed error:", error);
    return NextResponse.json({
      error: "Failed to create demo data",
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    await dbReady;
    await runTransaction(async (tx) => {
      await tx.delete(feeTiers);
      await tx.delete(products);
      await tx.delete(categories);
    });
    return NextResponse.json({ message: "Demo data removed" });
  } catch (error) {
    console.error("Demo delete error:", error);
    return NextResponse.json({ error: "Failed to remove demo data" }, { status: 500 });
  }
}
