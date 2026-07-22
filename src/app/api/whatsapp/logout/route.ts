import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logoutWhatsAppClient } from "@/lib/whatsapp";
import { handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    return NextResponse.json(await logoutWhatsAppClient());
  } catch (error) {
    return handleApiError("whatsapp/logout:POST", error, "Gagal logout WhatsApp");
  }
}
