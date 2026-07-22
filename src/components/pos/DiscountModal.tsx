"use client";

import { Modal, Button, Input } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";
import type { DiscountType } from "@/lib/pos-cart";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  discountType: DiscountType;
  discountValue: string;
  discountReason: string;
  discountAdminPin: string;
  discountAmount: number;
  cartTotal: number;
  onClose: () => void;
  onDiscountTypeChange: (type: DiscountType) => void;
  onDiscountValueChange: (value: string) => void;
  onDiscountReasonChange: (value: string) => void;
  onDiscountAdminPinChange: (value: string) => void;
  onValidationError: (message: string) => void;
}

export default function DiscountModal({
  open,
  discountType,
  discountValue,
  discountReason,
  discountAdminPin,
  discountAmount,
  cartTotal,
  onClose,
  onDiscountTypeChange,
  onDiscountValueChange,
  onDiscountReasonChange,
  onDiscountAdminPinChange,
  onValidationError,
}: Props) {
  const percent = cartTotal > 0 ? (discountAmount / cartTotal) * 100 : 0;
  const maxAmount = 100000;
  const maxPercent = 10;
  const isFullDiscount = discountAmount >= cartTotal;
  const needsPin = discountAmount > maxAmount || percent > maxPercent || isFullDiscount;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900">Diskon</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => onDiscountTypeChange("none")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${discountType === "none" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>Tanpa</button>
            <button onClick={() => onDiscountTypeChange("percent")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${discountType === "percent" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>Persen (%)</button>
            <button onClick={() => onDiscountTypeChange("rupiah")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${discountType === "rupiah" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>Rupiah</button>
          </div>
          {discountType !== "none" && (
            <>
              <Input
                label={discountType === "percent" ? "Diskon (%)" : "Diskon (Rp)"}
                type="number"
                value={discountValue}
                onChange={(event) => onDiscountValueChange(event.target.value)}
                placeholder={discountType === "percent" ? "10" : "5000"}
                autoFocus
              />
              {discountAmount > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl text-sm flex justify-between">
                  <span className="font-semibold text-emerald-700">Total Diskon:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <Input
                label="Alasan Diskon *"
                value={discountReason}
                onChange={(event) => onDiscountReasonChange(event.target.value)}
                placeholder="Pelanggan loyal / barang rusak / promo"
              />
              {discountAmount > 0 && needsPin && (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    Diskon {formatRupiah(discountAmount)} memerlukan otorisasi admin.
                    Masukkan PIN admin untuk melanjutkan.
                  </div>
                  <Input
                    label="PIN Admin"
                    type="password"
                    value={discountAdminPin}
                    onChange={(event) => onDiscountAdminPinChange(event.target.value)}
                    placeholder="••••••"
                  />
                </div>
              )}
            </>
          )}
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              if (discountType !== "none" && discountAmount > 0 && !discountReason.trim()) {
                onValidationError("Alasan diskon wajib diisi");
                return;
              }
              onClose();
            }}
          >
            Terapkan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
