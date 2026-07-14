import { NextResponse } from "next/server";
import { db, dbReady, runTransaction } from "@/db";
import {
  serviceCategories,
  brilinkServices,
  settings,
  accounts,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Seed Redesign: System template only, NO fake business data ──
//
// This seed creates ONLY:
//   1. Cash account (balance=0) — user fills saldo via setup wizard
//   2. Bank/e-wallet account templates (balance=0, isActive=false) — user activates
//   3. Service categories with stable `code` identifiers
//   4. Service templates with flow_type + fee=0 (user sets actual fees)
//   5. Neutral operational settings (no store_name, owner_name, phone)
//
// What is NOT seeded:
//   ❌ Fake balances (Rp500.000, Rp2.000.000)
//   ❌ Fake store_name ("Toko Maju Jaya"), owner_name ("Ahmad"), phone
//   ❌ Sample products (Indomie, Aqua, etc.) — that's demo data
//   ❌ Product categories — user creates their own
//   ❌ Fee amounts (Rp2.500, Rp1.500) — user sets actual fees
//   ❌ Default username/password — setup wizard handles admin creation
//   ❌ Opening balance mutations — only created when user sets initial balance
//
// Idempotent: re-running seed is safe. Each table checked before insert.
// All inserts wrapped in runTransaction → atomic.

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

      // ── 1. SETTINGS — neutral operational config only ──
      // Check by key 'app_mode' (idempotent marker)
      const [existingSettings] = await tx.select().from(settings).where(eq(settings.key, "app_mode")).limit(1);
      if (existingSettings) {
        stats.settings = 0;
      } else {
        await tx.insert(settings).values([
          // App identity (empty — user fills via setup wizard)
          { key: "app_mode", value: "recording_only" },
          { key: "currency", value: "IDR" },
          { key: "timezone", value: "Asia/Jakarta" },
          // Discount policy (safe defaults)
          { key: "max_discount_amount", value: "100000" },
          { key: "max_discount_percent", value: "10" },
          { key: "discount_admin_pin", value: "" },
          // Transaction policy
          { key: "require_transaction_reference", value: "false" },
          { key: "require_cash_confirmation", value: "true" },
          { key: "default_service_status", value: "recorded" },
          // Business info (empty — user fills via setup wizard)
          { key: "store_name", value: "" },
          { key: "store_address", value: "" },
          { key: "agent_id", value: "" },
          { key: "owner_name", value: "" },
          { key: "phone", value: "" },
          { key: "opening_balance", value: "0" },
          // Branding defaults (neutral)
          { key: "app_name", value: "POS & Agen Bisnis" },
          { key: "business_type", value: "Agen Bisnis" },
          { key: "services_label", value: "Layanan Agen" },
        ]);
        stats.settings = 17;
      }

      // ── 2. ACCOUNTS — templates with balance=0 ──
      // Cash: active, balance=0. Banks/e-wallets: inactive, balance=0.
      // User activates and fills saldo via setup wizard.
      const existingAccounts = await tx.select().from(accounts).limit(1);
      if (existingAccounts.length === 0) {
        await tx.insert(accounts).values([
          { code: "cash", name: "Kas Tunai (Laci)", icon: "banknote", color: "#22c55e", balance: 0, minBalance: 0, isActive: true },
          // Bank templates — inactive until user activates
          { code: "bank_bri", name: "M-Banking BRI", icon: "bri", color: "#00529B", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_mandiri", name: "M-Banking Mandiri", icon: "mandiri", color: "#003A79", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_bca", name: "M-Banking BCA", icon: "bca", color: "#0060AF", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_bni", name: "M-Banking BNI", icon: "bni", color: "#F37021", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_btn", name: "M-Banking BTN", icon: "btn", color: "#005F6B", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_bsi", name: "M-Banking BSI", icon: "landmark", color: "#00A04A", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_cimb", name: "M-Banking CIMB", icon: "cimb-niaga", color: "#7B2D8E", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_danamon", name: "M-Banking Danamon", icon: "danamon", color: "#003D7C", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_permata", name: "M-Banking Permata", icon: "permata", color: "#003D7C", balance: 0, minBalance: 0, isActive: false },
          { code: "bank_jago", name: "Jago", icon: "landmark", color: "#FF6B00", balance: 0, minBalance: 0, isActive: false },
          // E-wallet templates — inactive
          { code: "ewallet_dana", name: "DANA", icon: "dana", color: "#00A0DE", balance: 0, minBalance: 0, isActive: false },
          { code: "ewallet_ovo", name: "OVO", icon: "ovo", color: "#4C2A86", balance: 0, minBalance: 0, isActive: false },
          { code: "ewallet_gopay", name: "GoPay", icon: "gopay", color: "#00AED6", balance: 0, minBalance: 0, isActive: false },
          { code: "ewallet_linkaja", name: "LinkAja", icon: "linkaja", color: "#E11931", balance: 0, minBalance: 0, isActive: false },
        ]);
        stats.accounts = 15;
        // NO opening balance mutations — saldo is 0 until user sets it
      } else {
        stats.accounts = 0;
      }

      // ── 3. SERVICE CATEGORIES — stable code identifiers ──
      const existingSvcCats = await tx.select().from(serviceCategories).limit(1);
      let svcCats: Array<{ id: number; code: string }> = [];
      if (existingSvcCats.length === 0) {
        svcCats = await tx.insert(serviceCategories).values([
          { code: "transfer", name: "Transfer", icon: "arrow-right-left", color: "#3B82F6", sortOrder: 1 },
          { code: "cash_withdrawal", name: "Tarik Tunai", icon: "arrow-down-left", color: "#F59E0B", sortOrder: 2 },
          { code: "cash_deposit", name: "Setor Tunai", icon: "arrow-up-right", color: "#10B981", sortOrder: 3 },
          { code: "payment", name: "Bayar Tagihan", icon: "file-text", color: "#8B5CF6", sortOrder: 4 },
          { code: "topup", name: "Isi Ulang", icon: "smartphone", color: "#06B6D4", sortOrder: 5 },
          { code: "voucher", name: "Voucher & Game", icon: "gift", color: "#EC4899", sortOrder: 6 },
          { code: "financing", name: "Cicilan & Pembiayaan", icon: "receipt-text", color: "#F97316", sortOrder: 7 },
          { code: "inquiry", name: "Inquiry", icon: "search", color: "#64748B", sortOrder: 8 },
        ]).returning({ id: serviceCategories.id, code: serviceCategories.code });
        stats.serviceCategories = svcCats.length;
      } else {
        stats.serviceCategories = 0;
      }

      // Build code → id map
      const scm: Record<string, number> = {};
      for (const c of svcCats) scm[c.code] = c.id;
      if (svcCats.length === 0) {
        const allSvcCats = await tx.select().from(serviceCategories);
        for (const c of allSvcCats) scm[c.code] = c.id;
      }

      // ── 4. SERVICE TEMPLATES — fee=0, user sets actual fees ──
      // Each service has a stable `code` + `categoryCode` for lookup.
      // adminFee/agentFee = 0 (user configures via setup wizard or Pengaturan)
      const existingServices = await tx.select().from(brilinkServices).limit(1);
      if (existingServices.length === 0) {
        await tx.insert(brilinkServices).values([
          // ── Transfer ──
          { code: "transfer_cash", name: "Kirim Transfer Tunai", categoryId: scm["transfer"], categoryCode: "transfer", icon: "arrow-up-right", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "transfer", defaultFeeMethod: "cash" },
          { code: "transfer_receive", name: "Terima Transfer / Pencairan", categoryId: scm["transfer"], categoryCode: "transfer", icon: "arrow-down-left", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "out", bankEffect: "in", flowType: "cash_withdrawal", defaultFeeMethod: "deducted" },
          // ── Tarik Tunai ──
          { code: "cash_withdrawal", name: "Tarik Tunai", categoryId: scm["cash_withdrawal"], categoryCode: "cash_withdrawal", icon: "banknote", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "out", bankEffect: "none", flowType: "cash_withdrawal", defaultFeeMethod: "cash" },
          // ── Setor Tunai ──
          { code: "cash_deposit", name: "Setor Tunai", categoryId: scm["cash_deposit"], categoryCode: "cash_deposit", icon: "wallet", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "cash_deposit", defaultFeeMethod: "cash" },
          // ── Pembayaran Tagihan ──
          { code: "payment_pln", name: "Tagihan PLN", categoryId: scm["payment"], categoryCode: "payment", icon: "pln", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "payment_pdam", name: "Tagihan Air (PDAM)", categoryId: scm["payment"], categoryCode: "payment", icon: "pdam", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "payment_telkom", name: "Tagihan Telkom/Indihome", categoryId: scm["payment"], categoryCode: "payment", icon: "indihome", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "payment_bpjs", name: "BPJS Kesehatan", categoryId: scm["payment"], categoryCode: "payment", icon: "bpjs", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          // ── Token PLN (prabayar) ──
          { code: "token_pln_20k", name: "Token PLN 20K", categoryId: scm["payment"], categoryCode: "payment", icon: "pln", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "token_pln_50k", name: "Token PLN 50K", categoryId: scm["payment"], categoryCode: "payment", icon: "pln", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "token_pln_100k", name: "Token PLN 100K", categoryId: scm["payment"], categoryCode: "payment", icon: "pln", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "token_pln_200k", name: "Token PLN 200K", categoryId: scm["payment"], categoryCode: "payment", icon: "pln", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "token_pln_500k", name: "Token PLN 500K", categoryId: scm["payment"], categoryCode: "payment", icon: "pln", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "token_pln_1jt", name: "Token PLN 1Jt", categoryId: scm["payment"], categoryCode: "payment", icon: "pln", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          // ── Isi Ulang (Pulsa/Data/E-Wallet) ──
          { code: "topup_pulsa", name: "Pulsa Reguler", categoryId: scm["topup"], categoryCode: "topup", icon: "smartphone", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { code: "topup_data", name: "Paket Data", categoryId: scm["topup"], categoryCode: "topup", icon: "smartphone", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { code: "topup_ewallet", name: "Top Up E-Wallet", categoryId: scm["topup"], categoryCode: "topup", icon: "gopay", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          // ── Voucher Game ──
          { code: "voucher_game_12k", name: "Voucher Game 12K", categoryId: scm["voucher"], categoryCode: "voucher", icon: "gift", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { code: "voucher_game_33k", name: "Voucher Game 33K", categoryId: scm["voucher"], categoryCode: "voucher", icon: "gift", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { code: "voucher_game_66k", name: "Voucher Game 66K", categoryId: scm["voucher"], categoryCode: "voucher", icon: "gift", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { code: "voucher_game_132k", name: "Voucher Game 132K", categoryId: scm["voucher"], categoryCode: "voucher", icon: "gift", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { code: "voucher_game_330k", name: "Voucher Game 330K", categoryId: scm["voucher"], categoryCode: "voucher", icon: "gift", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          { code: "voucher_game_600k", name: "Voucher Game 600K", categoryId: scm["voucher"], categoryCode: "voucher", icon: "gift", adminFee: 0, agentFee: 0, useTieredFee: true, cashEffect: "in", bankEffect: "out", flowType: "topup", defaultFeeMethod: "cash" },
          // ── Cicilan & Pembiayaan ──
          { code: "financing_fif", name: "Cicilan FIF", categoryId: scm["financing"], categoryCode: "financing", icon: "file-text", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "financing_adira", name: "Cicilan Adira", categoryId: scm["financing"], categoryCode: "financing", icon: "file-text", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          { code: "financing_wom", name: "Cicilan WOM", categoryId: scm["financing"], categoryCode: "financing", icon: "file-text", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "in", bankEffect: "out", flowType: "payment", defaultFeeMethod: "cash" },
          // ── Inquiry ──
          { code: "inquiry_check", name: "Cek Saldo", categoryId: scm["inquiry"], categoryCode: "inquiry", icon: "bar-chart-3", adminFee: 0, agentFee: 0, useTieredFee: false, cashEffect: "none", bankEffect: "none", flowType: "inquiry", defaultFeeMethod: "cash" },
        ]).returning({ id: brilinkServices.id });
        stats.services = 27;
        // NO fee tiers — user configures fees via setup wizard or Pengaturan
      } else {
        stats.services = 0;
      }

      return stats;
    });

    const isEmpty = Object.values(result).every(v => v === 0);
    return NextResponse.json({
      message: isEmpty ? "Already seeded (all templates populated)" : "System templates created",
      stats: result,
      note: "Seed berisi template sistem saja. Saldo, fee, dan data bisnis diisi via Setup Wizard.",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({
      error: "Failed to seed",
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
