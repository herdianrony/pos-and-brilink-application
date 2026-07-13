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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await dbReady;

    // Catatan: Tabel users TIDAK dibuat di sini lagi.
    // Admin user harus dibuat via Setup Wizard (/setup → /api/auth/setup)
    // agar user diminta men-set password mereka sendiri.
    // Untuk development/testing, admin default (admin/admin123) bisa dibuat
    // manual via /api/auth/setup dengan credentials default.

    const existing = await db.select().from(settings).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ message: "Already seeded" });
    }

    // ACCOUNTS
    const accs = await db.insert(accounts).values([
      { code: "cash", name: "Kas Tunai (Laci)", icon: "banknote", color: "#22c55e", balance: 500000, minBalance: 200000 },
      { code: "bank_bri", name: "M-Banking BRI", icon: "landmark", color: "#003d79", balance: 2000000, minBalance: 500000 },
      { code: "bank_mandiri", name: "M-Banking Mandiri", icon: "landmark", color: "#003366", balance: 1500000, minBalance: 300000 },
      { code: "bank_bca", name: "M-Banking BCA", icon: "circle", color: "#003d79", balance: 1000000, minBalance: 300000 },
      { code: "bank_bni", name: "M-Banking BNI", icon: "circle", color: "#f97316", balance: 500000, minBalance: 200000 },
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
      { name: "Pulsa & Voucher", icon: "smartphone", color: "#10b981" },
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

    // SERVICE CATEGORIES (generik — bisa untuk BRILink, counter HP, agen pembayaran)
    const svcCats = await db.insert(serviceCategories).values([
      { name: "Transfer", icon: "arrow-up-right", color: "#0ea5e9", sortOrder: 1 },
      { name: "Penarikan Tunai", icon: "banknote", color: "#22c55e", sortOrder: 2 },
      { name: "Setor Tunai", icon: "wallet", color: "#f59e0b", sortOrder: 3 },
      { name: "Pembayaran Tagihan", icon: "file-text", color: "#8b5cf6", sortOrder: 4 },
      { name: "Pulsa & Paket Data", icon: "smartphone", color: "#06b6d4", sortOrder: 5 },
      { name: "Lainnya", icon: "package", color: "#6b7280", sortOrder: 6 },
    ]).returning();

    const scm: Record<string, number> = {};
    for (const c of svcCats) scm[c.name] = c.id;

    // SERVICES (generik — bisa untuk BRILink, counter HP, agen pembayaran)
    const svcs = await db.insert(brilinkServices).values([
      // Transfer
      { name: "Transfer Antar Bank (RTGS)", categoryId: scm["Transfer"], icon: "arrow-up-right", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "out", bankEffect: "in" },
      { name: "Transfer Sesama Bank", categoryId: scm["Transfer"], icon: "arrow-up-right", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "out", bankEffect: "in" },
      { name: "Transfer ke E-Wallet", categoryId: scm["Transfer"], icon: "smartphone", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "out", bankEffect: "in" },

      // Penarikan Tunai
      { name: "Tarik Tunai Bank", categoryId: scm["Penarikan Tunai"], icon: "banknote", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "out", bankEffect: "none" },
      { name: "Tarik Tunai Bank Lain", categoryId: scm["Penarikan Tunai"], icon: "banknote", adminFee: 3500, agentFee: 3500, useTieredFee: false, cashEffect: "out", bankEffect: "none" },

      // Setor Tunai
      { name: "Setor Tunai Bank", categoryId: scm["Setor Tunai"], icon: "wallet", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Setor Tunai Bank Lain", categoryId: scm["Setor Tunai"], icon: "wallet", adminFee: 3500, agentFee: 3500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },

      // Pembayaran Tagihan
      { name: "Tagihan PLN", categoryId: scm["Pembayaran Tagihan"], icon: "zap", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Tagihan Air (PDAM)", categoryId: scm["Pembayaran Tagihan"], icon: "droplet", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Tagihan Telkom/Indihome", categoryId: scm["Pembayaran Tagihan"], icon: "globe", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "BPJS Kesehatan", categoryId: scm["Pembayaran Tagihan"], icon: "heart-pulse", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Tagihan Cicilan", categoryId: scm["Pembayaran Tagihan"], icon: "file-text", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },

      // Pulsa & Paket Data (untuk counter HP)
      { name: "Pulsa Reguler", categoryId: scm["Pulsa & Paket Data"], icon: "smartphone", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Paket Data", categoryId: scm["Pulsa & Paket Data"], icon: "smartphone", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Top Up Game", categoryId: scm["Pulsa & Paket Data"], icon: "gamepad-2", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Top Up E-Wallet", categoryId: scm["Pulsa & Paket Data"], icon: "wallet", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out" },
      { name: "Voucher Game", categoryId: scm["Pulsa & Paket Data"], icon: "gift", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out" },

      // Lainnya
      { name: "Cek Saldo", categoryId: scm["Lainnya"], icon: "bar-chart-3", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "none", bankEffect: "none" },
    ]).returning();

    // FEE TIERS
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
      }
    }

    return NextResponse.json({ message: "Seed data created" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}