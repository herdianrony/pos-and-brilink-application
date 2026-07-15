import { NextResponse } from "next/server";
import { db, dbReady, runTransaction, parseSafeNumber } from "@/db";
import {
  users,
  accounts,
  accountMutations,
  settings,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasUsers, hashPassword, signToken, setSessionCookie } from "@/lib/auth";
import { validatePasswordPolicy } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── POST /api/setup/complete ──────────────────────
// Atomic setup completion: creates admin + settings + cash balance +
// activates settlement accounts in a single database transaction.
// If any part fails, everything rolls back.
//
// ONLY accessible when no users exist (first-run).
//
// Body:
//   {
//     store: { name, ownerName, phone, address, agentId },
//     admin: { name, username, password },
//     cashOpeningBalance: number,
//     settlementAccounts: [{ code, active, openingBalance }],
//     kasOnly: boolean  // true = no settlement accounts needed
//   }

interface SetupBody {
  store?: {
    name?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    agentId?: string;
  };
  admin?: {
    name?: string;
    username?: string;
    password?: string;
  };
  cashOpeningBalance?: number | string;
  settlementAccounts?: Array<{
    code?: string;
    active?: boolean;
    openingBalance?: number | string;
  }>;
  kasOnly?: boolean;
}

export async function POST(req: Request) {
  await dbReady;

  // Security: only allow if no users exist
  const usersExist = await hasUsers();
  if (usersExist) {
    return NextResponse.json(
      { error: "Setup sudah selesai. Silakan login." },
      { status: 409 }
    );
  }

  const body: SetupBody = await req.json();

  // ── Validate admin ──
  const adminName = String(body.admin?.name || "").trim();
  const adminUsername = String(body.admin?.username || "").trim();
  const adminPassword = String(body.admin?.password || "");

  if (!adminName || !adminUsername || !adminPassword) {
    return NextResponse.json(
      { error: "Nama, username, dan password admin wajib diisi" },
      { status: 400 }
    );
  }
  if (adminUsername.length < 3) {
    return NextResponse.json(
      { error: "Username minimal 3 karakter" },
      { status: 400 }
    );
  }
  const passwordPolicy = validatePasswordPolicy(adminPassword);
  if (!passwordPolicy.ok) {
    return NextResponse.json(
      { error: passwordPolicy.error },
      { status: 400 }
    );
  }

  // ── Validate store ──
  const storeName = String(body.store?.name || "").trim();
  const ownerName = String(body.store?.ownerName || "").trim();
  if (!storeName) {
    return NextResponse.json(
      { error: "Nama toko wajib diisi" },
      { status: 400 }
    );
  }

  // ── Validate settlement accounts ──
  const settlementAccounts = body.settlementAccounts || [];
  const activeSettlements = settlementAccounts.filter(s => s.active);
  if (!body.kasOnly && activeSettlements.length === 0) {
    // Allow kas-only mode, but warn if no settlement accounts
    // Don't block — user can add later
  }

  // P1-03: Validate that seed templates exist (cash account + service templates)
  const [cashAcc] = await db.select().from(accounts).where(eq(accounts.code, "cash")).limit(1);
  if (!cashAcc) {
    return NextResponse.json(
      { error: "Template seed belum tersedia. Jalankan /api/seed terlebih dahulu." },
      { status: 400 }
    );
  }

  try {
    const result = await runTransaction(async (tx) => {
      // ── 1. Create admin user ──
      const passwordHash = await hashPassword(adminPassword);
      const [user] = await tx.insert(users).values({
        name: adminName,
        username: adminUsername,
        passwordHash,
        role: "admin",
      }).returning({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
      });

      // ── 2. Save settings ──
      // Check if settings already exist (seed may have created them)
      const existingSettings = await tx.select().from(settings).limit(1);
      if (existingSettings.length === 0) {
        await tx.insert(settings).values([
          { key: "app_mode", value: "recording_only" },
          { key: "currency", value: "IDR" },
          { key: "timezone", value: "Asia/Jakarta" },
          { key: "max_discount_amount", value: "100000" },
          { key: "max_discount_percent", value: "10" },
          { key: "discount_admin_pin", value: "" },
          { key: "require_transaction_reference", value: "false" },
          { key: "require_cash_confirmation", value: "true" },
          { key: "default_service_status", value: "recorded" },
          { key: "store_name", value: storeName },
          { key: "store_address", value: body.store?.address || "" },
          { key: "agent_id", value: body.store?.agentId || "" },
          { key: "owner_name", value: ownerName },
          { key: "phone", value: body.store?.phone || "" },
          { key: "opening_balance", value: String(body.cashOpeningBalance || 0) },
          { key: "app_name", value: "POS & Agen Bisnis" },
          { key: "business_type", value: "Agen Bisnis" },
          { key: "services_label", value: "Layanan Agen" },
        ]);
      } else {
        // Update existing settings with user-provided values
        const updateSettings: Array<{ key: string; value: string }> = [
          { key: "store_name", value: storeName },
          { key: "store_address", value: body.store?.address || "" },
          { key: "agent_id", value: body.store?.agentId || "" },
          { key: "owner_name", value: ownerName },
          { key: "phone", value: body.store?.phone || "" },
          { key: "opening_balance", value: String(body.cashOpeningBalance || 0) },
        ];
        for (const s of updateSettings) {
          const [existing] = await tx.select().from(settings).where(eq(settings.key, s.key)).limit(1);
          if (existing) {
            await tx.update(settings).set({ value: s.value, updatedAt: new Date() }).where(eq(settings.key, s.key));
          } else {
            await tx.insert(settings).values({ key: s.key, value: s.value });
          }
        }
      }

      // ── 3. Set cash opening balance ──
      const cashOpening = parseSafeNumber(body.cashOpeningBalance, { default: 0, min: 0 });
      if (cashOpening > 0) {
        const [cashAcc] = await tx.select().from(accounts).where(eq(accounts.code, "cash")).limit(1);
        if (cashAcc) {
          await tx.update(accounts)
            .set({ balance: cashOpening, updatedAt: new Date() })
            .where(eq(accounts.id, cashAcc.id));
          await tx.insert(accountMutations).values({
            accountId: cashAcc.id,
            type: "opening",
            amount: cashOpening,
            balanceAfter: cashOpening,
            notes: "Saldo awal kas dari Setup Wizard",
          });
        }
      }

      // ── 4. Activate settlement accounts + set opening balances ──
      let activatedCount = 0;
      for (const settlement of activeSettlements) {
        if (!settlement.code) continue;
        const [acc] = await tx.select().from(accounts).where(eq(accounts.code, settlement.code)).limit(1);
        if (!acc) continue;

        const openingBalance = parseSafeNumber(settlement.openingBalance, { default: 0, min: 0 });
        await tx.update(accounts)
          .set({
            isActive: true,
            balance: openingBalance,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, acc.id));

        if (openingBalance > 0) {
          await tx.insert(accountMutations).values({
            accountId: acc.id,
            type: "opening",
            amount: openingBalance,
            balanceAfter: openingBalance,
            notes: `Saldo awal ${acc.name} dari Setup Wizard`,
          });
        }
        activatedCount++;
      }

      return { user, activatedCount, cashOpening };
    });

    // ── 5. Auto-login (set session cookie) ──
    const token = await signToken({
      sub: String(result.user.id),
      username: result.user.username,
      name: result.user.name,
      role: result.user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: result.user,
      activatedAccounts: result.activatedCount,
      cashOpeningBalance: result.cashOpening,
      kasOnly: body.kasOnly || activeSettlements.length === 0,
    });
  } catch (error) {
    console.error("Setup complete error:", error);
    return NextResponse.json(
      { error: "Gagal menyelesaikan setup" },
      { status: 500 }
    );
  }
}
