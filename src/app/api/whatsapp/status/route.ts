import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getWhatsAppStatus } from "@/lib/whatsapp";
import { handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    return NextResponse.json(await getWhatsAppStatus());
  } catch (error) {
    return handleApiError("whatsapp/status:GET", error, "Gagal memuat status WhatsApp");
  }
}
