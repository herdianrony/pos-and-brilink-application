"use client";

import { formatRupiah, formatDate } from "@/lib/utils";

export interface ReceiptData {
  store: {
    name: string;
    address?: string;
    phone?: string;
    agentId?: string;
  };
  invoice: {
    no: string;
    date: string;
    type: string;
    cashier: string;
    customer?: string;
  };
  items: Array<{
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }>;
  summary: {
    subtotal: number;
    adminFee?: number;
    discount?: number;
    total: number;
    paymentMethod?: string;
    paid?: number;
    change?: number;
  };
  footer?: string;
}

// ── Receipt Preview Component ─────────────────────
// Renders a visual preview of the thermal receipt (58mm or 80mm width).
// Used in success modal before printing, and in History detail for reprint.

export function ReceiptPreview({ data, width = 58 }: { data: ReceiptData; width?: 32 | 48 | 58 | 80 }) {
  // 58mm = ~32 chars, 80mm = ~48 chars
  const charsPerLine = width <= 32 ? 32 : width <= 48 ? 48 : width <= 58 ? 32 : 48;
  const maxWidthClass = width <= 58 ? "max-w-[230px]" : "max-w-[320px]";

  return (
    <div className={`mx-auto ${maxWidthClass} bg-white border border-dashed border-slate-300 p-3 font-mono text-xs text-slate-800 space-y-1`}>
      {/* Store header */}
      <div className="text-center space-y-0.5">
        <p className="font-bold text-sm uppercase">{data.store.name}</p>
        {data.store.address && <p className="text-[10px]">{data.store.address}</p>}
        {data.store.phone && <p className="text-[10px]">Telp: {data.store.phone}</p>}
        {data.store.agentId && <p className="text-[10px]">ID: {data.store.agentId}</p>}
      </div>

      <Divider chars={charsPerLine} />

      {/* Invoice info */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>No:</span>
          <span className="font-bold">{data.invoice.no}</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>{formatDate(data.invoice.date)}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span>{data.invoice.cashier}</span>
        </div>
        {data.invoice.customer && (
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>{data.invoice.customer}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tipe:</span>
          <span className="uppercase">{data.invoice.type}</span>
        </div>
      </div>

      <Divider chars={charsPerLine} />

      {/* Items */}
      {data.items.length > 0 ? (
        <div className="space-y-1">
          {data.items.map((item, i) => (
            <div key={i} className="space-y-0.5">
              <p className="font-medium">{item.name}</p>
              <div className="flex justify-between text-[10px]">
                <span>{item.qty} x {formatRupiah(item.price)}</span>
                <span className="font-semibold">{formatRupiah(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[10px] text-slate-400 italic">(Tidak ada item)</p>
      )}

      <Divider chars={charsPerLine} />

      {/* Summary */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatRupiah(data.summary.subtotal)}</span>
        </div>
        {data.summary.discount !== undefined && data.summary.discount > 0 && (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatRupiah(data.summary.discount)}</span>
          </div>
        )}
        {data.summary.adminFee !== undefined && data.summary.adminFee > 0 && (
          <div className="flex justify-between">
            <span>Admin</span>
            <span>{formatRupiah(data.summary.adminFee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-300 pt-1 mt-1">
          <span>TOTAL</span>
          <span>{formatRupiah(data.summary.total)}</span>
        </div>
        {data.summary.paymentMethod && (
          <div className="flex justify-between">
            <span>Bayar</span>
            <span className="capitalize">{data.summary.paymentMethod}</span>
          </div>
        )}
        {data.summary.paid !== undefined && data.summary.paid > 0 && (
          <div className="flex justify-between">
            <span>Tunai</span>
            <span>{formatRupiah(data.summary.paid)}</span>
          </div>
        )}
        {data.summary.change !== undefined && data.summary.change > 0 && (
          <div className="flex justify-between">
            <span>Kembali</span>
            <span>{formatRupiah(data.summary.change)}</span>
          </div>
        )}
      </div>

      <Divider chars={charsPerLine} />

      {/* Footer */}
      <div className="text-center text-[10px] space-y-0.5">
        <p>Terima kasih</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar</p>
        {data.footer && <p className="italic">{data.footer}</p>}
      </div>
    </div>
  );
}

function Divider({ chars }: { chars: number }) {
  return <div className="border-t border-dashed border-slate-300 my-1">{"".padEnd(chars, "-")}</div>;
}
