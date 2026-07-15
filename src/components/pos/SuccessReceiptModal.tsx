"use client";

import { Modal, Button } from "@/components/ui";
import { ReceiptPreview, type ReceiptData } from "@/components/ReceiptPreview";
import { formatRupiah } from "@/lib/utils";
import { CheckCircle, Printer } from "lucide-react";

interface Props {
  open: boolean;
  invoiceNo: string;
  receiptData: ReceiptData | null;
  grandTotal: number;
  showReceiptPreview: boolean;
  onClose: () => void;
  onToggleReceiptPreview: () => void;
  onNewTransaction: () => void;
  onGoToHistory: () => void;
}

export default function SuccessReceiptModal({
  open,
  invoiceNo,
  receiptData,
  grandTotal,
  showReceiptPreview,
  onClose,
  onToggleReceiptPreview,
  onNewTransaction,
  onGoToHistory,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-8 text-center space-y-5">
        <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center animate-bounceIn">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Transaksi Berhasil!</h3>
          <p className="text-sm text-slate-400 mt-1">Struk siap dicetak</p>
        </div>

        {receiptData && (
          <div className="space-y-2">
            <button
              onClick={onToggleReceiptPreview}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between text-sm font-medium text-slate-700"
            >
              <span className="flex items-center gap-2"><Printer size={14} /> Preview Struk</span>
              <span className="text-xs text-slate-400">{showReceiptPreview ? "Sembunyikan" : "Tampilkan"}</span>
            </button>
            {showReceiptPreview && (
              <div className="overflow-auto max-h-64 p-2 bg-slate-100 rounded-xl">
                <ReceiptPreview data={receiptData} width={58} />
              </div>
            )}
          </div>
        )}

        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-semibold">No. Invoice</span>
            <span className="font-mono font-bold text-primary">{invoiceNo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-semibold">Total</span>
            <span className="font-bold text-slate-800">{formatRupiah(receiptData?.summary.total ?? grandTotal)}</span>
          </div>
          {receiptData?.summary.discount && receiptData.summary.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">Diskon</span>
              <span className="font-bold text-emerald-600">-{formatRupiah(receiptData.summary.discount)}</span>
            </div>
          )}
          {receiptData?.summary.paid && receiptData.summary.paid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-semibold">Bayar</span>
              <span className="font-bold text-slate-800">{formatRupiah(receiptData.summary.paid)}</span>
            </div>
          )}
          {receiptData?.summary.change && receiptData.summary.change > 0 && (
            <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-semibold">Kembalian</span>
              <span className="font-bold text-emerald-600">{formatRupiah(receiptData.summary.change)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!receiptData}
            onClick={() => {
              if (!receiptData) return;
              if (typeof window !== "undefined" && window.electronAPI) {
                window.electronAPI.printer.print(receiptData);
              } else {
                window.print();
              }
            }}
          >
            <Printer size={18} /> Cetak Struk
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={onNewTransaction}>
              Transaksi Baru
            </Button>
            <Button variant="ghost" size="md" className="flex-1" onClick={onGoToHistory}>
              Lihat Riwayat
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
