import { NextResponse } from "next/server";
import { db, dbReady } from "@/db";
import {
  categories,
  products,
  serviceCategories,
  brilinkServices,
  feeTiers,
  settings,
  accounts,
  accountMutations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // C-02: Seed hanya bisa dipanggil jika:
  // 1. Dev mode (NODE_ENV !== production), atau
  // 2. Production + sudah authenticated (admin via setup wizard)
  // Bind ke 127.0.0.1 (C-01) sudah melindungi dari akses LAN
  if (process.env.NODE_ENV === "production") {
    const auth = await requireAuth();
    if (!auth.ok) {
      // Allow if no users exist yet (first-run before setup wizard)
      const { hasUsers } = await import("@/lib/auth");
      if (await hasUsers()) {
        return auth.response; // Users exist → require auth
      }
    }
  }
  try {
    await dbReady;
    // Admin user harus dibuat via Setup Wizard (/setup → /api/auth/setup)
    // agar user diminta men-set password mereka sendiri.
    // Untuk development/testing, admin default (admin/admin123) bisa dibuat
    // manual via /api/auth/setup dengan credentials default.

    const existing = await db.select().from(settings).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ message: "Already seeded" });
    }

    // ACCOUNTS — 15 rekening (Kas + 10 Bank + 4 E-Wallet)
    const accs = await db.insert(accounts).values([
      { code: "cash", name: "Kas Tunai (Laci)", icon: "banknote", color: "#22c55e", balance: 500000, minBalance: 200000 },
      { code: "bank_bri", name: "M-Banking BRI", icon: "bri", color: "#00529B", balance: 2000000, minBalance: 500000 },
      { code: "bank_mandiri", name: "M-Banking Mandiri", icon: "mandiri", color: "#003A79", balance: 1500000, minBalance: 300000 },
      { code: "bank_bca", name: "M-Banking BCA", icon: "bca", color: "#0060AF", balance: 1000000, minBalance: 300000 },
      { code: "bank_bni", name: "M-Banking BNI", icon: "bni", color: "#F37021", balance: 500000, minBalance: 200000 },
      { code: "bank_btn", name: "M-Banking BTN", icon: "btn", color: "#005F6B", balance: 500000, minBalance: 200000 },
      { code: "bank_bsi", name: "M-Banking BSI", icon: "landmark", color: "#00A04A", balance: 500000, minBalance: 200000 },
      { code: "bank_cimb", name: "M-Banking CIMB", icon: "cimb-niaga", color: "#7B2D8E", balance: 500000, minBalance: 200000 },
      { code: "bank_danamon", name: "M-Banking Danamon", icon: "danamon", color: "#003D7C", balance: 500000, minBalance: 200000 },
      { code: "bank_permata", name: "M-Banking Permata", icon: "permata", color: "#003D7C", balance: 500000, minBalance: 200000 },
      { code: "bank_jago", name: "Jago", icon: "landmark", color: "#FF6B00", balance: 500000, minBalance: 200000 },
      { code: "ewallet_dana", name: "DANA", icon: "dana", color: "#00A0DE", balance: 300000, minBalance: 100000 },
      { code: "ewallet_ovo", name: "OVO", icon: "ovo", color: "#4C2A86", balance: 300000, minBalance: 100000 },
      { code: "ewallet_gopay", name: "GoPay", icon: "gopay", color: "#00AED6", balance: 300000, minBalance: 100000 },
      { code: "ewallet_linkaja", name: "LinkAja", icon: "linkaja", color: "#E11931", balance: 300000, minBalance: 100000 },
    ]).returning();

    for (const acc of accs) {
      await db.insert(accountMutations).values({
        accountId: acc.id,
        type: "opening",
        amount: acc.balance,
        balanceAfter: acc.balance,
        notes: `Saldo awal ${acc.name}`,
      });
    }

    // SETTINGS
    await db.insert(settings).values([
      // Branding (customizable — bisa diubah di Pengaturan)
      { key: "app_name", value: "POS & Agen Bisnis" },
      { key: "business_type", value: "Agen Bisnis" },
      { key: "services_label", value: "Layanan Agen" },
      // Store info
      { key: "store_name", value: "Toko Maju Jaya" },
      { key: "store_address", value: "Jl. Raya No.123, Jakarta" },
      { key: "agent_id", value: "" },
      { key: "owner_name", value: "Ahmad Surya" },
      { key: "phone", value: "081234567890" },
      { key: "opening_balance", value: "500000" },
    ]);

    // PRODUCT CATEGORIES
    const cats = await db.insert(categories).values([
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
    ]).returning();

    const cm: Record<string, number> = {};
    for (const c of cats) cm[c.name] = c.id;

    // PRODUCTS
    await db.insert(products).values([
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

    // SERVICE CATEGORIES
    const svcCats = await db.insert(serviceCategories).values([
      { name: "Transfer", icon: "arrow-up-right", color: "#0ea5e9", sortOrder: 1 },
      { name: "Penarikan Tunai", icon: "banknote", color: "#22c55e", sortOrder: 2 },
      { name: "Setor Tunai", icon: "wallet", color: "#f59e0b", sortOrder: 3 },
      { name: "Pembayaran Tagihan", icon: "file-text", color: "#8b5cf6", sortOrder: 4 },
      { name: "Token PLN", icon: "zap", color: "#f97316", sortOrder: 5 },
      { name: "Pulsa & Paket Data", icon: "smartphone", color: "#06b6d4", sortOrder: 6 },
      { name: "Voucher Game", icon: "gift", color: "#ec4899", sortOrder: 7 },
      { name: "Cicilan", icon: "file-text", color: "#dc2626", sortOrder: 8 },
      { name: "Lainnya", icon: "package", color: "#6b7280", sortOrder: 9 },
    ]).returning();

    const scm: Record<string, number> = {};
    for (const c of svcCats) scm[c.name] = c.id;

    // SERVICES
    const svcs = await db.insert(brilinkServices).values([
      // Transfer
      { name: "Transfer Antar Bank (RTGS)", categoryId: scm["Transfer"], icon: "arrow-up-right", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "out", bankEffect: "in" },
      { name: "Transfer Sesama Bank", categoryId: scm["Transfer"], icon: "arrow-up-right", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "out", bankEffect: "in" },
      { name: "Transfer ke E-Wallet", categoryId: scm["Transfer"], icon: "ovo", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "out", bankEffect: "in" },

      // Penarikan Tunai
      { name: "Tarik Tunai Bank", categoryId: scm["Penarikan Tunai"], icon: "banknote", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "out", bankEffect: "none" },
      { name: "Tarik Tunai Bank Lain", categoryId: scm["Penarikan Tunai"], icon: "banknote", adminFee: 3500, agentFee: 3500, useTieredFee: false, cashEffect: "out", bankEffect: "none" },

      // Setor Tunai
      { name: "Setor Tunai Bank", categoryId: scm["Setor Tunai"], icon: "wallet", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Setor Tunai Bank Lain", categoryId: scm["Setor Tunai"], icon: "wallet", adminFee: 3500, agentFee: 3500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },

      // Pembayaran Tagihan
      { name: "Tagihan PLN", categoryId: scm["Pembayaran Tagihan"], icon: "pln", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Tagihan Air (PDAM)", categoryId: scm["Pembayaran Tagihan"], icon: "pdam", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Tagihan Telkom/Indihome", categoryId: scm["Pembayaran Tagihan"], icon: "indihome", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "BPJS Kesehatan", categoryId: scm["Pembayaran Tagihan"], icon: "bpjs", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },

      // Token PLN (Prabayar) — fee tiered 20K-1Jt
      { name: "Token PLN 20K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 1500, agentFee: 1500, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Token PLN 50K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 1500, agentFee: 1500, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Token PLN 100K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 2000, agentFee: 2000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Token PLN 200K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 2000, agentFee: 2000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Token PLN 500K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 3000, agentFee: 3000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Token PLN 1Jt", categoryId: scm["Token PLN"], icon: "pln", adminFee: 5000, agentFee: 5000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },

      // Pulsa & Paket Data
      { name: "Pulsa Reguler", categoryId: scm["Pulsa & Paket Data"], icon: "smartphone", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Paket Data", categoryId: scm["Pulsa & Paket Data"], icon: "smartphone", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Top Up Game", categoryId: scm["Pulsa & Paket Data"], icon: "gamepad-2", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Top Up E-Wallet", categoryId: scm["Pulsa & Paket Data"], icon: "gopay", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out" },

      // Voucher Game — fee tiered 12K-600K
      { name: "Voucher Game 12K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 1000, agentFee: 1000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Voucher Game 33K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 1500, agentFee: 1500, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Voucher Game 66K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 2000, agentFee: 2000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Voucher Game 132K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 2500, agentFee: 2500, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Voucher Game 330K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 3000, agentFee: 3000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },
      { name: "Voucher Game 600K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 5000, agentFee: 5000, useTieredFee: true, cashEffect: "in", bankEffect: "out" },

      // Cicilan Multifinance
      { name: "Cicilan FIF", categoryId: scm["Cicilan"], icon: "file-text", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Cicilan Adira", categoryId: scm["Cicilan"], icon: "file-text", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Cicilan WOM", categoryId: scm["Cicilan"], icon: "file-text", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },

      // Lainnya
      { name: "Cek Saldo", categoryId: scm["Lainnya"], icon: "bar-chart-3", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "none", bankEffect: "none" },
    ]).returning();

    // FEE TIERS — Transfer, Tarik, Setor, Token PLN, Voucher Game
    for (const svc of svcs) {
      if (svc.name.includes("Transfer Antar Bank")) {
        await db.insert(feeTiers).values([
          { serviceId: svc.id, minAmount: 0, maxAmount: 10000000, adminFee: 2500, agentFee: 2500 },
          { serviceId: svc.id, minAmount: 10000001, maxAmount: 50000000, adminFee: 5000, agentFee: 5000 },
          { serviceId: svc.id, minAmount: 50000001, maxAmount: null, adminFee: 10000, agentFee: 10000 },
        ]);
      } else if (svc.name.includes("Tarik Tunai")) {
        await db.insert(feeTiers).values([
          { serviceId: svc.id, minAmount: 0, maxAmount: 1000000, adminFee: 2500, agentFee: 2500 },
          { serviceId: svc.id, minAmount: 1000001, maxAmount: 5000000, adminFee: 3500, agentFee: 3500 },
          { serviceId: svc.id, minAmount: 5000001, maxAmount: null, adminFee: 5000, agentFee: 5000 },
        ]);
      } else if (svc.name.includes("Setor Tunai")) {
        await db.insert(feeTiers).values([
          { serviceId: svc.id, minAmount: 0, maxAmount: 500000, adminFee: 3000, agentFee: 3000 },
          { serviceId: svc.id, minAmount: 500001, maxAmount: 2000000, adminFee: 5000, agentFee: 5000 },
          { serviceId: svc.id, minAmount: 2000001, maxAmount: 5000000, adminFee: 7500, agentFee: 7500 },
          { serviceId: svc.id, minAmount: 5000001, maxAmount: null, adminFee: 10000, agentFee: 10000 },
        ]);
      } else if (svc.name.includes("Token PLN 20K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 20000, maxAmount: 20000, adminFee: 1500, agentFee: 1500 }]);
      } else if (svc.name.includes("Token PLN 50K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 50000, maxAmount: 50000, adminFee: 1500, agentFee: 1500 }]);
      } else if (svc.name.includes("Token PLN 100K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 100000, maxAmount: 100000, adminFee: 2000, agentFee: 2000 }]);
      } else if (svc.name.includes("Token PLN 200K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 200000, maxAmount: 200000, adminFee: 2000, agentFee: 2000 }]);
      } else if (svc.name.includes("Token PLN 500K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 500000, maxAmount: 500000, adminFee: 3000, agentFee: 3000 }]);
      } else if (svc.name.includes("Token PLN 1Jt")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 1000000, maxAmount: 1000000, adminFee: 5000, agentFee: 5000 }]);
      } else if (svc.name.includes("Voucher Game 12K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 12000, maxAmount: 12000, adminFee: 1000, agentFee: 1000 }]);
      } else if (svc.name.includes("Voucher Game 33K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 33000, maxAmount: 33000, adminFee: 1500, agentFee: 1500 }]);
      } else if (svc.name.includes("Voucher Game 66K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 66000, maxAmount: 66000, adminFee: 2000, agentFee: 2000 }]);
      } else if (svc.name.includes("Voucher Game 132K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 132000, maxAmount: 132000, adminFee: 2500, agentFee: 2500 }]);
      } else if (svc.name.includes("Voucher Game 330K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 330000, maxAmount: 330000, adminFee: 3000, agentFee: 3000 }]);
      } else if (svc.name.includes("Voucher Game 600K")) {
        await db.insert(feeTiers).values([{ serviceId: svc.id, minAmount: 600000, maxAmount: 600000, adminFee: 5000, agentFee: 5000 }]);
      }
    }

    return NextResponse.json({ message: "Seed data created" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}