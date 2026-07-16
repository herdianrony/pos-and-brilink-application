import { NextResponse } from "next/server";
import { db, dbReady, runTransaction } from "@/db";
import {
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
//   3. Neutral operational settings (no store_name, owner_name, phone)
//
// What is NOT seeded:
//   ❌ Fake balances (Rp500.000, Rp2.000.000)
//   ❌ Fake store_name ("Toko Maju Jaya"), owner_name ("Ahmad"), phone
//   ❌ Sample products (Indomie, Aqua, etc.) — that's demo data
//   ❌ Product categories — user creates their own
//   ❌ Service categories and service templates — owner creates their own flows
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
          // WhatsApp owner notifications (disabled by default)
          { key: "whatsapp_enabled", value: "false" },
          { key: "whatsapp_auto_notify_owner", value: "false" },
          { key: "whatsapp_owner_number", value: "" },
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
        stats.settings = 20;
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

      // Service categories and service templates are intentionally not seeded in production.
      // Each business can define its own operational services and saldo effects.
      stats.serviceCategories = 0;
      stats.services = 0;

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
    }, { status: 500 });
  }
}
