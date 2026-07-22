"use client";

import { Badge, Button, Modal, Spinner } from "@/components/ui";
import { formatDate, formatRupiah } from "@/lib/utils";
import { getStatusConfig } from "@/lib/history";
import {
  Ban,
  Banknote,
  CheckCircle,
  Landmark,
  Printer,
  Receipt,
  RotateCcw,
  ShoppingCart,
  X,
} from "lucide-react";
import type { ReceiptData } from "@/components/ReceiptPreview";
import type {
  TransactionActionType,
  Trx,
  TrxDetail,
} from "@/types/transactions";

interface Props {
  detail: TrxDetail | null;
  loadingDet: boolean;
  servicesLabel: string;
  settings: Record<string, string | undefined>;
  showProfit?: boolean;
  onClose: () => void;
  openAction: (type: TransactionActionType, transaction: Trx) => void;
}

export default function TransactionDetailModal({
  detail,
  loadingDet,
  servicesLabel,
  settings,
  showProfit = true,
  onClose,
  openAction,
}: Props) {
  const cashReceived = Number(detail?.cashReceived || 0);
  const cashDispensed = Number(detail?.cashDispensed || 0);
  const hasCashFlow = cashReceived > 0 || cashDispensed > 0;

  return (
    <Modal open={!!detail || loadingDet} onClose={onClose} size="md">
      {loadingDet ? (
        <Spinner />
      ) : (
        detail && (
          <div className="p-5 space-y-4">
            {/* Header with status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${detail.type === "pos" ? "bg-emerald-100" : "bg-purple-100"}`}
                >
                  {detail.type === "pos" ? (
                    <ShoppingCart size={20} className="text-emerald-600" />
                  ) : (
                    <Landmark size={20} className="text-purple-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Detail Transaksi
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {detail.invoiceNo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detail.status && (
                  <Badge variant={getStatusConfig(detail.status).variant}>
                    {getStatusConfig(detail.status).label}
                  </Badge>
                )}
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Invoice info — compact row */}
            <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Tanggal</span>
                <span className="font-medium text-slate-700">
                  {formatDate(detail.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Tipe</span>
                <span className="font-medium text-slate-700">
                  {detail.type === "pos" ? "POS" : servicesLabel}
                </span>
              </div>
              {detail.subType && (
                <div>
                  <span className="text-slate-400 block">Layanan</span>
                  <span className="font-medium text-slate-700">
                    {detail.subType}
                  </span>
                </div>
              )}
              {detail.flowType && (
                <div>
                  <span className="text-slate-400 block">Flow</span>
                  <span className="font-medium text-slate-700 capitalize">
                    {detail.flowType.replace(/_/g, " ")}
                  </span>
                </div>
              )}
              {detail.customerName && (
                <div>
                  <span className="text-slate-400 block">Pelanggan</span>
                  <span className="font-medium text-slate-700">
                    {detail.customerName}
                  </span>
                </div>
              )}
              {detail.customerPhone && (
                <div>
                  <span className="text-slate-400 block">No. HP/Rek</span>
                  <span className="font-medium text-slate-700">
                    {detail.customerPhone}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block">Pembayaran</span>
                <span className="font-medium text-slate-700 capitalize">
                  {detail.paymentMethod}
                </span>
              </div>
              {detail.referenceNo && (
                <div>
                  <span className="text-slate-400 block">No. Referensi</span>
                  <span className="font-medium text-slate-700 font-mono">
                    {detail.referenceNo}
                  </span>
                </div>
              )}
              {detail.feeMethod && detail.feeMethod !== "cash" && (
                <div>
                  <span className="text-slate-400 block">Metode Fee</span>
                  <span className="font-medium text-slate-700 capitalize">
                    {detail.feeMethod}
                  </span>
                </div>
              )}
              {detail.confirmedAt && (
                <div>
                  <span className="text-slate-400 block">Dikonfirmasi</span>
                  <span className="font-medium text-slate-700">
                    {formatDate(detail.confirmedAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Items */}
            {detail.items?.length > 0 && (
              <div className="border-t border-dashed pt-3 space-y-2">
                <p className="text-sm font-bold text-slate-600">Item:</p>
                {detail.items.map((i) => (
                  <div
                    key={i.id}
                    className="flex justify-between text-sm bg-slate-50 rounded-xl p-2.5"
                  >
                    <div>
                      <span className="font-medium">{i.productName}</span>
                      <span className="text-slate-400 ml-1">
                        × {i.quantity}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatRupiah(i.subtotal)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatRupiah(i.unitPrice)} / pcs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Denominations */}
            {detail.denominations && detail.denominations.length > 0 && (
              <div className="border-t border-dashed pt-3 space-y-2">
                <p className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                  <Banknote size={14} /> Denominasi Uang:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {detail.denominations.map((d) => (
                    <div
                      key={d.id}
                      className="text-xs bg-slate-50 rounded-xl p-2 flex justify-between"
                    >
                      <span>
                        {formatRupiah(d.denomination)} × {d.count}
                      </span>
                      <span className="font-semibold">
                        {formatRupiah(d.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cash flow summary */}
            {hasCashFlow && (
              <div className="border-t border-dashed pt-3 space-y-1">
                <p className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                  <Receipt size={14} /> Arus Kas:
                </p>
                {cashReceived > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Banknote size={12} className="text-emerald-500" /> Kas
                      Diterima
                    </span>
                    <span className="font-semibold text-emerald-600">
                      +{formatRupiah(cashReceived)}
                    </span>
                  </div>
                )}
                {cashDispensed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Banknote size={12} className="text-red-500" /> Kas
                      Dikeluarkan
                    </span>
                    <span className="font-semibold text-red-600">
                      -{formatRupiah(cashDispensed)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="border-t border-dashed pt-3 space-y-1">
              {detail.adminFee && parseFloat(detail.adminFee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Biaya Admin</span>
                  <span className="text-amber-600 font-semibold">
                    {formatRupiah(detail.adminFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-extrabold">
                <span>Total</span>
                <span className="text-primary">
                  {formatRupiah(detail.totalAmount)}
                </span>
              </div>
              {showProfit && detail.profit && parseFloat(detail.profit) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Keuntungan</span>
                  <span className="text-emerald-600 font-bold">
                    {formatRupiah(detail.profit)}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {detail.notes && (
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
                <span className="font-semibold">Catatan:</span> {detail.notes}
              </div>
            )}

            {/* Print receipt button */}
            {detail.type === "pos" && detail.items?.length > 0 && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const receiptData: ReceiptData = {
                    store: {
                      name: settings.app_name || "POS & Agen Bisnis",
                      address: settings.store_address,
                      phone: settings.phone,
                    },
                    invoice: {
                      no: detail.invoiceNo,
                      date: detail.createdAt,
                      type: detail.type.toUpperCase(),
                      cashier: "Admin",
                      customer: detail.customerName || undefined,
                    },
                    items: detail.items.map((i) => ({
                      name: i.productName,
                      qty: i.quantity,
                      price: parseFloat(i.unitPrice),
                      subtotal: parseFloat(i.subtotal),
                    })),
                    summary: {
                      subtotal:
                        parseFloat(detail.totalAmount) +
                        (detail.adminFee ? parseFloat(detail.adminFee) : 0),
                      total: parseFloat(detail.totalAmount),
                      paymentMethod: detail.paymentMethod || "cash",
                    },
                  };
                  if (typeof window !== "undefined" && window.electronAPI) {
                    window.electronAPI.printer.print(receiptData);
                  } else {
                    window.print();
                  }
                }}
              >
                <Printer size={16} /> Cetak Ulang Struk
              </Button>
            )}

            {/* Lifecycle actions */}
            {detail.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => openAction("void", detail)}
                >
                  <Ban size={14} /> Batalkan
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => openAction("complete", detail)}
                >
                  <CheckCircle size={14} /> Tandai Selesai
                </Button>
              </div>
            )}
            {detail.status === "completed" && detail.type === "brilink" && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => openAction("reverse", detail)}
              >
                <RotateCcw size={14} /> Reverse Transaksi
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={onClose}>
              Tutup
            </Button>
          </div>
        )
      )}
    </Modal>
  );
}
