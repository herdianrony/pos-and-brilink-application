import { NextResponse } from "next/server";
import { db, dbReady } from "@/db";
import { accounts } from "@/db/schema";
import { hasUsers } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── GET /api/setup/templates ──────────────────────
// Public endpoint that returns account templates for Setup Wizard.
// ONLY accessible when no users exist yet (first-run before admin created).
// After admin exists, returns 404 (setup completed).

export async function GET() {
  await dbReady;

  // Security: only allow if no users exist (first-run)
  const usersExist = await hasUsers();
  if (usersExist) {
    return NextResponse.json(
      { error: "Setup sudah selesai. Endpoint ini tidak tersedia." },
      { status: 404 }
    );
  }

  // Return bank/e-wallet templates (exclude cash — cash is always active)
  const allAccounts = await db.select().from(accounts);
  const templates = allAccounts
    .filter(a => a.code !== "cash")
    .map(a => ({
      id: a.id,
      code: a.code,
      name: a.name,
      icon: a.icon,
      color: a.color,
      isActive: a.isActive,
      balance: a.balance,
    }));

  // Also return cash account info for display
  const cashAccount = allAccounts.find(a => a.code === "cash");

  return NextResponse.json({
    templates,
    cashAccount: cashAccount ? {
      id: cashAccount.id,
      code: cashAccount.code,
      name: cashAccount.name,
      balance: cashAccount.balance,
    } : null,
  });
}
