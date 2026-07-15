import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { notifyOwnerForTransaction } from "@/lib/whatsapp";
import { handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const transactionId = Number(body.transactionId);
    if (!Number.isFinite(transactionId) || transactionId <= 0) {
      return NextResponse.json({ error: "transactionId tidak valid" }, { status: 400 });
    }
    return NextResponse.json(await notifyOwnerForTransaction(transactionId));
  } catch (error) {
    return handleApiError("whatsapp/notify-owner:POST", error, "Gagal mengirim notifikasi WhatsApp owner");
  }
}
