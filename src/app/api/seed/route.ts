import { NextResponse } from "next/server";
import { db, dbReady, runTransaction } from "@/db";
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

// ── F-04: Atomic, recoverable seed ───────────────
// Idempotent: re-running seed aman bahkan jika seed sebelumnya gagal di tengah.
// Setiap tabel di-check terlebih dahulu; bila sudah ada data → skip insert tabel itu.
// Semua insert dibungkus dalam runTransaction → atomic.
export async function POST() {
  // C-02: Seed hanya bisa dipanggil jika:
  // 1. Dev mode (NODE_ENV !== production), atau
  // 2. Production + sudah authenticated (admin via setup wizard)
  if (process.env.NODE_ENV === "production") {
    const auth = await requireAuth();
    if (!auth.ok) {
      const { hasUsers } = await import("@/lib/auth");
      if (await hasUsers()) {
        return auth.response;
      }
    }
  }
  try {
    await dbReady;

    const result = await runTransaction(async (tx) => {
      const stats: Record<string, number> = {};

      // ── Idempotent check per tabel ──────────────
      // Bila tabel sudah ada data, skip insert tabel itu.
      // Khusus settings: cek key 'app_name' (idempotent marker).
      const [existingSettings] = await tx.select().from(settings).where(eq(settings.key, "app_name")).limit(1);
      if (existingSettings) {
        stats.settings = 0;
      } else {
        await tx.insert(settings).values([
          { key: "app_name", value: "POS & Agen Bisnis" },
          { key: "business_type", value: "Agen Bisnis" },
          { key: "services_label", value: "Layanan Agen" },
          { key: "store_name", value: "Toko Maju Jaya" },
          { key: "store_address", value: "Jl. Raya No.123, Jakarta" },
          { key: "agent_id", value: "" },
          { key: "owner_name", value: "Ahmad Surya" },
          { key: "phone", value: "081234567890" },
          { key: "opening_balance", value: "500000" },
        ]);
        stats.settings = 9;
      }

      // ── ACCOUNTS ───────────────────────────────
      const existingAccounts = await tx.select().from(accounts).limit(1);
      let accs: Array<{ id: number; name: string; balance: number }> = [];
      if (existingAccounts.length === 0) {
        accs = await tx.insert(accounts).values([
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
        ]).returning({ id: accounts.id, name: accounts.name, balance: accounts.balance });

        for (const acc of accs) {
          await tx.insert(accountMutations).values({
            accountId: acc.id,
            type: "opening",
            amount: acc.balance,
            balanceAfter: acc.balance,
            notes: `Saldo awal ${acc.name}`,
          });
        }
        stats.accounts = accs.length;
      } else {
        stats.accounts = 0;
      }

      // ── PRODUCT CATEGORIES ─────────────────────
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
        stats.categories = cats.length;
      } else {
        stats.categories = 0;
      }

      const cm: Record<string, number> = {};
      for (const c of cats) cm[c.name] = c.id;
      // If no cats inserted, fetch existing
      if (cats.length === 0) {
        const allCats = await tx.select().from(categories);
        for (const c of allCats) cm[c.name] = c.id;
      }

      // ── PRODUCTS ───────────────────────────────
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

      // ── SERVICE CATEGORIES ─────────────────────
      const existingSvcCats = await tx.select().from(serviceCategories).limit(1);
      let svcCats: Array<{ id: number; name: string }> = [];
      if (existingSvcCats.length === 0) {
        svcCats = await tx.insert(serviceCategories).values([
          { name: "Transfer", icon: "arrow-up-right", color: "#0ea5e9", sortOrder: 1 },
          { name: "Penarikan Tunai", icon: "banknote", color: "#22c55e", sortOrder: 2 },
          { name: "Setor Tunai", icon: "wallet", color: "#f59e0b", sortOrder: 3 },
          { name: "Pembayaran Tagihan", icon: "file-text", color: "#8b5cf6", sortOrder: 4 },
          { name: "Token PLN", icon: "zap", color: "#f97316", sortOrder: 5 },
          { name: "Pulsa & Paket Data", icon: "smartphone", color: "#06b6d4", sortOrder: 6 },
          { name: "Voucher Game", icon: "gift", color: "#ec4899", sortOrder: 7 },
          { name: "Cicilan", icon: "file-text", color: "#dc2626", sortOrder: 8 },
          { name: "Lainnya", icon: "package", color: "#6b7280", sortOrder: 9 },
        ]).returning({ id: serviceCategories.id, name: serviceCategories.name });
        stats.serviceCategories = svcCats.length;
      } else {
        stats.serviceCategories = 0;
      }

      const scm: Record<string, number> = {};
      for (const c of svcCats) scm[c.name] = c.id;
      if (svcCats.length === 0) {
        const allSvcCats = await tx.select().from(serviceCategories);
        for (const c of allSvcCats) scm[c.name] = c.id;
      }

      // ── SERVICES ───────────────────────────────
      // S-01: Transfer direction fixed — "Kirim Transfer Tunai" (cash in, bank out)
      //   adalah skenario agen paling umum: nasabah bayar tunai, agen kirim transfer.
      //   "Terima Transfer/Pencairan" (cash out, bank in) adalah layanan terpisah.
      // S-04: flow_type dan default_fee_method diset eksplisit per service.
      const existingServices = await tx.select().from(brilinkServices).limit(1);
      let svcs: Array<{ id: number; name: string }> = [];
      if (existingServices.length === 0) {
        svcs = await tx.insert(brilinkServices).values([
          // ── Transfer (S-01: cash in, bank out = nasabah bayar tunai, agen kirim transfer) ──
          { name: "Kirim Transfer Antar Bank", categoryId: scm["Transfer"], icon: "arrow-up-right", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "transfer", defaultFeeMethod: "cash" },
          { name: "Kirim Transfer Sesama Bank", categoryId: scm["Transfer"], icon: "arrow-up-right", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "transfer", defaultFeeMethod: "cash" },
          { name: "Kirim Transfer ke E-Wallet", categoryId: scm["Transfer"], icon: "ovo", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "transfer", defaultFeeMethod: "cash" },
          // S-01: Terima Transfer / Pencairan (cash out, bank in) — layanan terpisah
          { name: "Terima Transfer / Pencairan", categoryId: scm["Transfer"], icon: "arrow-down-left", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "out", bankEffect: "in", flowType: "cash_withdrawal", defaultFeeMethod: "deducted" },
          // ── Tarik Tunai ──
          { name: "Tarik Tunai Bank", categoryId: scm["Penarikan Tunai"], icon: "banknote", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "out", bankEffect: "none", flowType: "cash_withdrawal", defaultFeeMethod: "cash" },
          { name: "Tarik Tunai Bank Lain", categoryId: scm["Penarikan Tunai"], icon: "banknote", adminFee: 3500, agentFee: 3500, useTieredFee: false, cashEffect: "out", bankEffect: "none", flowType: "cash_withdrawal", defaultFeeMethod: "cash" },
          // ── Setor Tunai ──
          { name: "Setor Tunai Bank", categoryId: scm["Setor Tunai"], icon: "wallet", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "cash_deposit", defaultFeeMethod: "cash" },
          { name: "Setor Tunai Bank Lain", categoryId: scm["Setor Tunai"], icon: "wallet", adminFee: 3500, agentFee: 3500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "cash_deposit", defaultFeeMethod: "cash" },
          // ── Pembayaran Tagihan ──
          { name: "Tagihan PLN", categoryId: scm["Pembayaran Tagihan"], icon: "pln", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Tagihan Air (PDAM)", categoryId: scm["Pembayaran Tagihan"], icon: "pdam", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Tagihan Telkom/Indihome", categoryId: scm["Pembayaran Tagihan"], icon: "indihome", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "BPJS Kesehatan", categoryId: scm["Pembayaran Tagihan"], icon: "bpjs", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          // ── Token PLN ──
          { name: "Token PLN 20K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 1500, agentFee: 1500, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Token PLN 50K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 1500, agentFee: 1500, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Token PLN 100K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 2000, agentFee: 2000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Token PLN 200K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 2000, agentFee: 2000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Token PLN 500K", categoryId: scm["Token PLN"], icon: "pln", adminFee: 3000, agentFee: 3000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Token PLN 1Jt", categoryId: scm["Token PLN"], icon: "pln", adminFee: 5000, agentFee: 5000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          // ── Pulsa & Paket Data ──
          { name: "Pulsa Reguler", categoryId: scm["Pulsa & Paket Data"], icon: "smartphone", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Paket Data", categoryId: scm["Pulsa & Paket Data"], icon: "smartphone", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Top Up Game", categoryId: scm["Pulsa & Paket Data"], icon: "gamepad-2", adminFee: 1500, agentFee: 1500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Top Up E-Wallet", categoryId: scm["Pulsa & Paket Data"], icon: "gopay", adminFee: 1000, agentFee: 1000, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          // ── Voucher Game ──
          { name: "Voucher Game 12K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 1000, agentFee: 1000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Voucher Game 33K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 1500, agentFee: 1500, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Voucher Game 66K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 2000, agentFee: 2000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Voucher Game 132K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 2500, agentFee: 2500, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Voucher Game 330K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 3000, agentFee: 3000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { name: "Voucher Game 600K", categoryId: scm["Voucher Game"], icon: "gift", adminFee: 5000, agentFee: 5000, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          // ── Cicilan ──
          { name: "Cicilan FIF", categoryId: scm["Cicilan"], icon: "file-text", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Cicilan Adira", categoryId: scm["Cicilan"], icon: "file-text", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { name: "Cicilan WOM", categoryId: scm["Cicilan"], icon: "file-text", adminFee: 2500, agentFee: 2500, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          // ── Lainnya ──
          // S-04: Cek Saldo = inquiry flow (no nominal, no fee, no cash effect)
          { name: "Cek Saldo", categoryId: scm["Lainnya"], icon: "bar-chart-3", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "none", bankEffect: "none", flowType: "inquiry", defaultFeeMethod: "cash" },
        ]).returning({ id: brilinkServices.id, name: brilinkServices.name });
        stats.services = svcs.length;
      } else {
        stats.services = 0;
      }

      // ── FEE TIERS (only if services freshly inserted) ──
      if (svcs.length > 0) {
        let tierCount = 0;
        for (const svc of svcs) {
          let tiers: Array<{ minAmount: number; maxAmount: number | null; adminFee: number; agentFee: number }> = [];
          if (svc.name.includes("Transfer Antar Bank")) {
            tiers = [
              { minAmount: 0, maxAmount: 10000000, adminFee: 2500, agentFee: 2500 },
              { minAmount: 10000001, maxAmount: 50000000, adminFee: 5000, agentFee: 5000 },
              { minAmount: 50000001, maxAmount: null, adminFee: 10000, agentFee: 10000 },
            ];
          } else if (svc.name.includes("Tarik Tunai")) {
            tiers = [
              { minAmount: 0, maxAmount: 1000000, adminFee: 2500, agentFee: 2500 },
              { minAmount: 1000001, maxAmount: 5000000, adminFee: 3500, agentFee: 3500 },
              { minAmount: 5000001, maxAmount: null, adminFee: 5000, agentFee: 5000 },
            ];
          } else if (svc.name.includes("Setor Tunai")) {
            tiers = [
              { minAmount: 0, maxAmount: 500000, adminFee: 3000, agentFee: 3000 },
              { minAmount: 500001, maxAmount: 2000000, adminFee: 5000, agentFee: 5000 },
              { minAmount: 2000001, maxAmount: 5000000, adminFee: 7500, agentFee: 7500 },
              { minAmount: 5000001, maxAmount: null, adminFee: 10000, agentFee: 10000 },
            ];
          } else if (svc.name === "Token PLN 20K") {
            tiers = [{ minAmount: 20000, maxAmount: 20000, adminFee: 1500, agentFee: 1500 }];
          } else if (svc.name === "Token PLN 50K") {
            tiers = [{ minAmount: 50000, maxAmount: 50000, adminFee: 1500, agentFee: 1500 }];
          } else if (svc.name === "Token PLN 100K") {
            tiers = [{ minAmount: 100000, maxAmount: 100000, adminFee: 2000, agentFee: 2000 }];
          } else if (svc.name === "Token PLN 200K") {
            tiers = [{ minAmount: 200000, maxAmount: 200000, adminFee: 2000, agentFee: 2000 }];
          } else if (svc.name === "Token PLN 500K") {
            tiers = [{ minAmount: 500000, maxAmount: 500000, adminFee: 3000, agentFee: 3000 }];
          } else if (svc.name === "Token PLN 1Jt") {
            tiers = [{ minAmount: 1000000, maxAmount: 1000000, adminFee: 5000, agentFee: 5000 }];
          } else if (svc.name === "Voucher Game 12K") {
            tiers = [{ minAmount: 12000, maxAmount: 12000, adminFee: 1000, agentFee: 1000 }];
          } else if (svc.name === "Voucher Game 33K") {
            tiers = [{ minAmount: 33000, maxAmount: 33000, adminFee: 1500, agentFee: 1500 }];
          } else if (svc.name === "Voucher Game 66K") {
            tiers = [{ minAmount: 66000, maxAmount: 66000, adminFee: 2000, agentFee: 2000 }];
          } else if (svc.name === "Voucher Game 132K") {
            tiers = [{ minAmount: 132000, maxAmount: 132000, adminFee: 2500, agentFee: 2500 }];
          } else if (svc.name === "Voucher Game 330K") {
            tiers = [{ minAmount: 330000, maxAmount: 330000, adminFee: 3000, agentFee: 3000 }];
          } else if (svc.name === "Voucher Game 600K") {
            tiers = [{ minAmount: 600000, maxAmount: 600000, adminFee: 5000, agentFee: 5000 }];
          }
          if (tiers.length > 0) {
            await tx.insert(feeTiers).values(tiers.map(t => ({ serviceId: svc.id, ...t })));
            tierCount += tiers.length;
          }
        }
        stats.feeTiers = tierCount;
      } else {
        stats.feeTiers = 0;
      }

      return stats;
    });

    const isEmpty = Object.values(result).every(v => v === 0);
    return NextResponse.json({
      message: isEmpty ? "Already seeded (all tables populated)" : "Seed data created",
      stats: result,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({
      error: "Failed to seed",
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
