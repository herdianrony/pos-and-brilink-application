"use client";

import { Modal, Button, Input, Card } from "@/components/ui";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DynamicIcon } from "@/components/DynamicIcon";
import { formatRupiah, cn } from "@/lib/utils";
import { Banknote, X } from "lucide-react";

interface Props {
  open: boolean;
  customerName: string;
  payMethod: string;
  cashAmt: string;
  paymentReference: string;
  total: number;
  grandTotal: number;
  change: number;
  submitting: boolean;
  onClose: () => void;
  onCustomerNameChange: (value: string) => void;
  onPayMethodChange: (value: string) => void;
  onCashAmountChange: (value: string) => void;
  onPaymentReferenceChange: (value: string) => void;
  onCheckout: () => void;
}

export default function PaymentModal({
  open,
  customerName,
  payMethod,
  cashAmt,
  paymentReference,
  total,
  grandTotal,
  change,
  submitting,
  onClose,
  onCustomerNameChange,
  onPayMethodChange,
  onCashAmountChange,
  onPaymentReferenceChange,
  onCheckout,
}: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-800">Pembayaran</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <Input label="Nama Pelanggan (opsional)" value={customerName} onChange={e => onCustomerNameChange(e.target.value)} placeholder="Nama pelanggan" />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">Metode Pembayaran</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { m: "cash", icon: "banknote", label: "Tunai" },
              { m: "transfer", icon: "landmark", label: "Transfer" },
              { m: "qris", icon: "smartphone", label: "QRIS" },
            ] as const).map(({ m, icon, label }) => (
              <button key={m} onClick={() => onPayMethodChange(m)}
                className={cn(
                  "py-3 rounded-xl text-sm font-semibold border-2 transition-all flex flex-col items-center gap-1.5",
                  payMethod === m ? "bg-primary/5 border-primary text-primary" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                )}>
                <DynamicIcon name={icon} size={20} className={payMethod === m ? "text-primary" : "text-slate-500"} />
                {label}
              </button>
            ))}
          </div>
        </div>
        {payMethod !== "cash" && (
          <Input
            label="No. Referensi Pembayaran (opsional)"
            value={paymentReference}
            onChange={e => onPaymentReferenceChange(e.target.value)}
            placeholder="Contoh: TRX-12345 dari M-Banking / QRIS"
          />
        )}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-blue-50 border-primary/10">
          <div className="flex justify-between text-lg font-extrabold">
            <span className="text-slate-600">Total</span>
            <span className="text-primary">{formatRupiah(grandTotal)}</span>
          </div>
        </Card>
        {payMethod === "cash" && (
          <div className="space-y-3">
            <CurrencyInput label="Uang Diterima" value={cashAmt} onChange={(v) => onCashAmountChange(String(v))} placeholder="0" autoFocus />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Uang Pas", value: grandTotal },
                { label: "50rb", value: 50000 },
                { label: "100rb", value: 100000 },
                { label: "200rb", value: 200000 },
                { label: "500rb", value: 500000 },
                { label: "1jt", value: 1000000 },
              ].map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => onCashAmountChange(String(quick.value))}
                  disabled={quick.value < grandTotal}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {quick.label}
                </button>
              ))}
            </div>
            {parseFloat(cashAmt || "0") >= grandTotal && parseFloat(cashAmt || "0") > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3 text-center flex items-center justify-center gap-2">
                <Banknote size={18} className="text-emerald-600" />
                <span className="text-emerald-600 font-bold text-lg">Kembalian: {formatRupiah(change)}</span>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Batal</Button>
          <Button variant="success" size="lg" className="flex-1" onClick={onCheckout}
            disabled={submitting || (payMethod === "cash" && parseFloat(cashAmt || "0") < grandTotal)}>
            {submitting ? "Memproses..." : "Konfirmasi Bayar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
