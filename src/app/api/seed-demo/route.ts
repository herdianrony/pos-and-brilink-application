import { NextResponse } from "next/server";
import { db, dbReady, runTransaction } from "@/db";
import {
  categories,
  products,
  feeTiers,
  brilinkServices,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Demo Data Endpoint (LOCKED DOWN) ──────────────
// Creates sample products + product categories + fee tiers for testing/demo.
//
// Security:
//   - Production: ONLY admin can access (requireAdmin). Returns 404 for non-admin.
//   - Dev: open to any authenticated user for convenience.
//   - Demo data is marked with is_demo=true (categories) / source='demo' (products)
//     so DELETE only removes demo rows, never user's real data.
//
// Usage:
//   POST /api/seed-demo   → create demo data (marked as demo)
//   DELETE /api/seed-demo → remove ONLY demo-marked data (never real data)

// Demo marker: categories created by demo get is_demo=true via a prefix in name
// (SQLite doesn't have boolean default on ALTER, so we use name prefix for safety)
const DEMO_MARKER = "[DEMO]";

export async function POST() {
  // P0: Always require admin — demo data can affect financial config
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    await dbReady;

    const result = await runTransaction(async (tx) => {
      const stats: Record<string, number> = {};

      // ── Product Categories (marked with DEMO_MARKER) ──
      // Only create if no demo categories exist yet
      const existingDemoCats = await tx.select().from(categories)
        .where(sql`${categories.name} LIKE ${DEMO_MARKER + "%"}`)
        .limit(1);
      let cats: Array<{ id: number; name: string }> = [];
      if (existingDemoCats.length === 0) {
        cats = await tx.insert(categories).values([
          { name: `${DEMO_MARKER} Makanan`, icon: "utensils", color: "#ef4444" },
          { name: `${DEMO_MARKER} Minuman`, icon: "cup-soda", color: "#3b82f6" },
          { name: `${DEMO_MARKER} Rokok`, icon: "package", color: "#6b7280" },
          { name: `${DEMO_MARKER} Sembako`, icon: "shopping-cart", color: "#22c55e" },
          { name: `${DEMO_MARKER} Snack`, icon: "cookie", color: "#f59e0b" },
          { name: `${DEMO_MARKER} ATK`, icon: "pencil", color: "#8b5cf6" },
          { name: `${DEMO_MARKER} Toiletries`, icon: "spray-can", color: "#ec4899" },
          { name: `${DEMO_MARKER} Aksesoris HP`, icon: "smartphone", color: "#06b6d4" },
          { name: `${DEMO_MARKER} Pulsa & Voucher`, icon: "smartphone", color: "#00875A" },
          { name: `${DEMO_MARKER} Gas & Listrik`, icon: "zap", color: "#f97316" },
        ]).returning({ id: categories.id, name: categories.name });
        stats.productCategories = cats.length;
      } else {
        stats.productCategories = 0;
      }

      const cm: Record<string, number> = {};
      for (const c of cats) cm[c.name] = c.id;
      if (cats.length === 0) {
        const allDemoCats = await tx.select().from(categories)
          .where(sql`${categories.name} LIKE ${DEMO_MARKER + "%"}`);
        for (const c of allDemoCats) cm[c.name] = c.id;
      }

      // ── Products (marked with DEMO_MARKER in name) ──
      const existingDemoProducts = await tx.select().from(products)
        .where(sql`${products.name} LIKE ${DEMO_MARKER + "%"}`)
        .limit(1);
      if (existingDemoProducts.length === 0) {
        await tx.insert(products).values([
          { name: `${DEMO_MARKER} Indomie Goreng`, barcode: "089686010947", categoryId: cm[`${DEMO_MARKER} Makanan`], buyPrice: 2500, sellPrice: 3500, stock: 120, minStock: 20, unit: "pcs" },
          { name: `${DEMO_MARKER} Indomie Kuah Soto`, barcode: "089686010602", categoryId: cm[`${DEMO_MARKER} Makanan`], buyPrice: 2500, sellPrice: 3500, stock: 80, minStock: 15, unit: "pcs" },
          { name: `${DEMO_MARKER} Mie Sedaap Goreng`, barcode: "089686040203", categoryId: cm[`${DEMO_MARKER} Makanan`], buyPrice: 2800, sellPrice: 3500, stock: 60, minStock: 10, unit: "pcs" },
          { name: `${DEMO_MARKER} Aqua 600ml`, barcode: "761100100019", categoryId: cm[`${DEMO_MARKER} Minuman`], buyPrice: 2800, sellPrice: 4000, stock: 200, minStock: 30, unit: "botol" },
          { name: `${DEMO_MARKER} Teh Botol Sosro 450ml`, barcode: "899900100219", categoryId: cm[`${DEMO_MARKER} Minuman`], buyPrice: 3500, sellPrice: 5000, stock: 48, minStock: 10, unit: "botol" },
          { name: `${DEMO_MARKER} Le Minerale 600ml`, barcode: "749100100012", categoryId: cm[`${DEMO_MARKER} Minuman`], buyPrice: 2200, sellPrice: 3500, stock: 150, minStock: 25, unit: "botol" },
          { name: `${DEMO_MARKER} Coca Cola 390ml`, barcode: "545500200100", categoryId: cm[`${DEMO_MARKER} Minuman`], buyPrice: 5500, sellPrice: 7500, stock: 36, minStock: 8, unit: "botol" },
          { name: `${DEMO_MARKER} GG Surya 12`, barcode: "899001010012", categoryId: cm[`${DEMO_MARKER} Rokok`], buyPrice: 20000, sellPrice: 24000, stock: 50, minStock: 10, unit: "bungkus" },
          { name: `${DEMO_MARKER} Sampoerna Mild 16`, barcode: "899001020016", categoryId: cm[`${DEMO_MARKER} Rokok`], buyPrice: 28000, sellPrice: 32000, stock: 40, minStock: 8, unit: "bungkus" },
          { name: `${DEMO_MARKER} Djarum Super 12`, barcode: "899001030012", categoryId: cm[`${DEMO_MARKER} Rokok`], buyPrice: 19000, sellPrice: 22000, stock: 35, minStock: 8, unit: "bungkus" },
          { name: `${DEMO_MARKER} Beras Premium 5kg`, categoryId: cm[`${DEMO_MARKER} Sembako`], buyPrice: 62000, sellPrice: 70000, stock: 25, minStock: 5, unit: "karung" },
        ]);
        stats.products = 11;
      } else {
        stats.products = 0;
      }

      // ── Fee Tiers (sample for tiered services only) ──
      // P1: Only create tiers for services with useTieredFee=true
      // (transfer_cash has useTieredFee=false, so it won't get tiers)
      const svcs = await tx.select().from(brilinkServices);
      let tierCount = 0;
      for (const svc of svcs) {
        if (!svc.useTieredFee) continue;
        const existingTiers = await tx.select().from(feeTiers).where(eq(feeTiers.serviceId, svc.id));
        if (existingTiers.length > 0) continue;

        let tiers: Array<{ minAmount: number; maxAmount: number | null; adminFee: number; agentFee: number }> = [];
        if (svc.code === "cash_withdrawal") {
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
      message: "Demo data created (marked with [DEMO] prefix)",
      stats: result,
      note: "Demo data ditandai dengan prefix [DEMO]. DELETE hanya menghapus data demo, tidak menghapus data user.",
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
  // P0: Always require admin
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    await dbReady;
    const result = await runTransaction(async (tx) => {
      // P0: Only delete demo-marked rows — NEVER delete all products/categories
      // 1. Find demo product IDs (to delete their fee tiers if any linked)
      const demoProducts = await tx.select({ id: products.id }).from(products)
        .where(sql`${products.name} LIKE ${DEMO_MARKER + "%"}`);
      const demoProductIds = demoProducts.map(p => p.id);

      // 2. Delete demo products only
      if (demoProductIds.length > 0) {
        await tx.delete(products).where(sql`${products.id} IN (${sql.join(demoProductIds.map(id => sql`${id}`), sql`,`)})`);
      }

      // 3. Delete demo categories only
      const deletedCats = await tx.delete(categories)
        .where(sql`${categories.name} LIKE ${DEMO_MARKER + "%"}`)
        .returning({ id: categories.id });

      // 4. Fee tiers: delete tiers for services that no longer exist (orphaned)
      //    This is safe — fee tiers are always linked to services, not to demo products
      //    We do NOT delete all fee tiers — only orphaned ones from demo
      //    Actually, fee tiers are tied to services (which are system templates, not demo).
      //    So we leave fee tiers alone in DELETE — user can manage them via Pengaturan.

      return {
        deletedProducts: demoProductIds.length,
        deletedCategories: deletedCats.length,
      };
    });

    return NextResponse.json({
      message: "Demo data removed (only [DEMO]-marked rows deleted)",
      stats: result,
    });
  } catch (error) {
    console.error("Demo delete error:", error);
    return NextResponse.json({ error: "Failed to remove demo data" }, { status: 500 });
  }
}
