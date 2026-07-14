"use client";

import { formatRupiah, formatDate } from "@/lib/utils";

export interface StatementData {
  account: {
    name: string;
    code: string;
    icon?: string | null;
    color?: string | null;
  };
  period: {
    start: string;
    end: string;
  };
  summary: {
    openingBalance: number;
    totalIn: number;
    totalOut: number;
    closingBalance: number;
    count: number;
  };
  mutations: Array<{
    id: number;
    date: string;
    type: string;
    typeLabel: string;
    amount: number;
    balanceAfter: number;
    notes: string | null;
  }>;
  store?: {
    name: string;
    address?: string;
    phone?: string;
  };
}

const mutationTypeLabels: Record<string, string> = {
  opening: "Saldo Awal",
  opening_adjust: "Penyesuaian",
  adjustment: "Penyesuaian",
  transfer_in: "Trf Masuk",
  transfer_out: "Trf Keluar",
  pos_in: "Penjualan",
  pos_out: "Pembayaran",
  brilink_in: "Agen Masuk",
  brilink_out: "Agen Keluar",
  brilink_fee: "Fee Agen",
  cash_in: "Kas Masuk",
  cash_out: "Kas Keluar",
};

// ── Statement Preview Component ───────────────────
// Renders a visual preview of the rekening koran / account statement.
// Used in a modal before printing, similar to ReceiptPreview for POS.

export function StatementPreview({ data, width = 80 }: { data: StatementData; width?: 58 | 80 | 100 }) {
  const maxWidthClass = width <= 58 ? "max-w-[230px]" : width <= 80 ? "max-w-[320px]" : "max-w-[400px]";

  return (
    <div className={`mx-auto ${maxWidthClass} bg-white border border-dashed border-slate-300 p-4 font-mono text-xs text-slate-800 space-y-2`}>
      {/* Store header */}
      {data.store && (
        <div className="text-center space-y-0.5">
          {data.store.name && <p className="font-bold text-sm uppercase">{data.store.name}</p>}
          {data.store.address && <p className="text-[10px]">{data.store.address}</p>}
          {data.store.phone && <p className="text-[10px]">Telp: {data.store.phone}</p>}
        </div>
      )}

      {/* Title */}
      <div className="text-center space-y-0.5 border-y border-dashed border-slate-300 py-2">
        <p className="font-bold text-sm uppercase">Rekening Koran</p>
        <p className="text-[10px]">{data.account.name}</p>
        <p className="text-[10px] text-slate-500">
          Periode: {formatDate(data.period.start)} s/d {formatDate(data.period.end)}
        </p>
      </div>

      {/* Summary */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Saldo Awal</span>
          <span className="font-semibold">{formatRupiah(data.summary.openingBalance)}</span>
        </div>
        <div className="flex justify-between text-emerald-700">
          <span>Total Masuk</span>
          <span className="font-semibold">+{formatRupiah(data.summary.totalIn)}</span>
        </div>
        <div className="flex justify-between text-red-700">
          <span>Total Keluar</span>
          <span className="font-semibold">-{formatRupiah(data.summary.totalOut)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-300 pt-1 mt-1">
          <span>Saldo Akhir</span>
          <span>{formatRupiah(data.summary.closingBalance)}</span>
        </div>
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>{data.summary.count} transaksi</span>
        </div>
      </div>

      {/* Mutations table */}
      <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
        <p className="font-bold text-center text-[10px] uppercase tracking-wider">Detail Mutasi</p>

        {data.mutations.length === 0 ? (
          <p className="text-center text-[10px] text-slate-400 italic py-2">(Tidak ada mutasi)</p>
        ) : (
          <div className="space-y-1">
            {data.mutations.map((mut) => {
              const isIn = mut.amount > 0;
              const typeLabel = mut.typeLabel || mutationTypeLabels[mut.type] || mut.type;
              return (
                <div key={mut.id} className="space-y-0.5 border-b border-dotted border-slate-200 pb-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">{formatDate(mut.date)}</span>
                    <span className="font-medium">{typeLabel}</span>
                  </div>
                  {mut.notes && (
                    <p className="text-[9px] text-slate-500 truncate">{mut.notes}</p>
                  )}
                  <div className="flex justify-between">
                    <span className={isIn ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                      {isIn ? "+" : ""}{formatRupiah(Math.abs(mut.amount))}
                    </span>
                    <span className="text-slate-600 text-[10px]">
                      Saldo: {formatRupiah(mut.balanceAfter)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[9px] text-slate-500 border-t border-dashed border-slate-300 pt-2">
        <p>Dicetak: {formatDate(new Date().toISOString())}</p>
        <p className="mt-0.5">Rekening Koran — {data.account.name}</p>
      </div>
    </div>
  );
}
