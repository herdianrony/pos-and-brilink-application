import { NextResponse } from "next/server";
import type { ReceiptData } from "@/types/electron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/hardware/printer
 * Bridge ke Electron IPC untuk cetak struk.
 * Body: ReceiptData
 *
 * Jika berjalan di luar Electron (web mode), return error.
 * Untuk web mode, client harus menggunakan helper printReceipt()
 * di src/lib/hardware/index.ts yang langsung call window.electronAPI.
 */
export async function POST(req: Request) {
  const data: ReceiptData = await req.json();

  // Di Electron, Next.js server berjalan di child process — tidak punya
  // akses langsung ke main process. Client harus panggil window.electronAPI
  // langsung, bukan via fetch.
  //
  // API ini disediakan sebagai dokumentasi & fallback. Return instruksi.
  return NextResponse.json(
    {
      ok: false,
      error:
        "Cetak struk harus dilakukan via window.electronAPI.printer.print() di renderer, bukan via API route. Lihat src/lib/hardware/index.ts.",
      data,
    },
    { status: 400 }
  );
}
