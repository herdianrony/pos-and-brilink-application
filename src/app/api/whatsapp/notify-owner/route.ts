import { NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import {
  buildOwnerNotificationMessage,
  getWhatsAppSettings,
  normalizeWhatsAppNumber,
  notifyOwnerForTransaction,
  shouldNotifyOwner,
} from "@/lib/whatsapp";
import { transactions } from "@/db/schema";
import { db, dbReady } from "@/db";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const transactionId = Number(body.transactionId);
    if (!Number.isFinite(transactionId) || transactionId <= 0) {
      return NextResponse.json({ error: "transactionId tidak valid" }, { status: 400 });
    }

    // prepareOnly is used by Electron renderer: the API builds the safe owner
    // message from DB, while Electron main process sends it via native WhatsApp.
    if (body.prepareOnly) {
      const auth = await requireAuth();
      if (!auth.ok) return auth.response;
      await dbReady;
      const cfg = await getWhatsAppSettings();
      if (!cfg.enabled || !cfg.autoNotifyOwner) return NextResponse.json({ prepared: false, reason: "disabled" });
      if (!cfg.ownerNumber) return NextResponse.json({ prepared: false, reason: "missing_owner_number" });
      const [trx] = await db.select({ flowType: transactions.flowType }).from(transactions).where(eq(transactions.id, transactionId)).limit(1);
      if (!trx || !shouldNotifyOwner(trx.flowType)) return NextResponse.json({ prepared: false, reason: "not_required" });
      return NextResponse.json({
        prepared: true,
        to: normalizeWhatsAppNumber(cfg.ownerNumber),
        message: await buildOwnerNotificationMessage(transactionId),
      });
    }

    // Direct server-side sending controls the WhatsApp singleton/session and is admin-only.
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    return NextResponse.json(await notifyOwnerForTransaction(transactionId));
  } catch (error) {
    return handleApiError("whatsapp/notify-owner:POST", error, "Gagal mengirim notifikasi WhatsApp owner");
  }
}
