import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, CreditCard, Keyboard, QrCode, X } from "lucide-react";
import type { AccountRow } from "../api";
import { formatRupiah } from "../lib/format";
import { tw } from "../lib/tw";
import { Button, CardHeader } from "./ui";
import { CurrencyInput } from "./CurrencyInput";

type PaymentMethod = "cash" | "transfer" | "qris";

const methods: Array<{ id: PaymentMethod; label: string; hint: string; icon: typeof Banknote; shortcut: string }> = [
  { id: "cash", label: "Tunai", hint: "F2", icon: Banknote, shortcut: "F2" },
  { id: "transfer", label: "Transfer", hint: "F3", icon: CreditCard, shortcut: "F3" },
  { id: "qris", label: "QRIS", hint: "F4", icon: QrCode, shortcut: "F4" },
];

export function PaymentModal({
  open,
  total,
  itemCount,
  paymentMethod,
  settlementAccountId,
  settlementAccounts,
  saving,
  onPaymentMethodChange,
  onSettlementAccountChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  total: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  settlementAccountId: string;
  settlementAccounts: AccountRow[];
  saving: boolean;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onSettlementAccountChange: (value: string) => void;
  onClose: () => void;
  onConfirm: (cashReceived?: number) => void;
}) {
  const [cashReceived, setCashReceived] = useState("");
  const cashReceivedNumber = Number(cashReceived || 0);
  const changeAmount = cashReceivedNumber - total;
  const needsAccount = paymentMethod !== "cash";
  const cashIsValid = paymentMethod !== "cash" || cashReceivedNumber >= total;
  const accountIsValid = !needsAccount || Boolean(settlementAccountId);
  const canConfirm = itemCount > 0 && cashIsValid && accountIsValid && !saving;

  const cashShortcuts = useMemo(() => {
    const base = [total, 50_000, 100_000, 150_000, 200_000].filter((amount, index, rows) => amount >= total && rows.indexOf(amount) === index);
    return base.slice(0, 5);
  }, [total]);

  useEffect(() => {
    if (!open) return;
    if (paymentMethod === "cash") {
      setCashReceived(String(total));
    }
  }, [open, paymentMethod, total]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "F2") {
        event.preventDefault();
        onPaymentMethodChange("cash");
      }
      if (event.key === "F3") {
        event.preventDefault();
        onPaymentMethodChange("transfer");
      }
      if (event.key === "F4") {
        event.preventDefault();
        onPaymentMethodChange("qris");
      }
      if (event.key === "Enter" && canConfirm) {
        event.preventDefault();
        onConfirm(paymentMethod === "cash" ? cashReceivedNumber : undefined);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canConfirm, cashReceivedNumber, onClose, onConfirm, onPaymentMethodChange, open, paymentMethod]);

  if (!open) return null;

  return (
    <div className={tw("modal-backdrop")}>
      <section className={tw("payment-modal")}> 
        <CardHeader>
          <div><p className={tw("eyebrow")}>Pembayaran POS</p><h2>Konfirmasi Pembayaran</h2></div>
          <Button variant="secondary" className={tw("h-10 w-10 p-0")} onClick={onClose} title="Tutup" aria-label="Tutup modal pembayaran"><X size={18} /></Button>
        </CardHeader>

        <div className={tw("payment-total-box")}>
          <span>Total Belanja</span>
          <strong>{formatRupiah(total)}</strong>
          <small>{itemCount} item dalam keranjang</small>
        </div>

        <div className={tw("payment-method-grid")}> 
          {methods.map((method) => {
            const MethodIcon = method.icon;
            return (
              <button key={method.id} type="button" className={tw(paymentMethod === method.id ? "payment-method-card selected" : "payment-method-card")} onClick={() => onPaymentMethodChange(method.id)}>
                <MethodIcon size={22} />
                <strong>{method.label}</strong>
                <small>{method.hint}</small>
              </button>
            );
          })}
        </div>

        {paymentMethod === "cash" ? (
          <div className={tw("payment-section")}> 
            <label className={tw("field-label")}>Uang Diterima
              <CurrencyInput value={cashReceived} onChange={setCashReceived} />
            </label>
            <div className={tw("cash-shortcut-grid")}> 
              {cashShortcuts.map((amount) => (
                <button key={amount} type="button" className={tw("filter-chip")} onClick={() => setCashReceived(String(amount))}>{amount === total ? "Uang Pas" : formatRupiah(amount)}</button>
              ))}
            </div>
            <div className={tw(changeAmount >= 0 ? "change-box success" : "change-box warning")}> 
              <span>{changeAmount >= 0 ? "Kembalian" : "Uang Kurang"}</span>
              <strong>{formatRupiah(Math.abs(changeAmount))}</strong>
            </div>
          </div>
        ) : (
          <div className={tw("payment-section")}> 
            <label className={tw("field-label")}>Rekening Penerima
              <select className={tw("form-input")} value={settlementAccountId} onChange={(event) => onSettlementAccountChange(event.target.value)}>
                <option value="">Pilih rekening</option>
                {settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
              </select>
            </label>
            <div className={tw("payment-note-box")}><CheckCircle2 size={18} /><span>Saldo akan masuk ke rekening yang dipilih setelah transaksi disimpan.</span></div>
          </div>
        )}

        <div className={tw("shortcut-help")}> 
          <Keyboard size={16} />
          <span>Shortcut: F2 Tunai • F3 Transfer • F4 QRIS • Enter Simpan • Esc Batal</span>
        </div>

        <div className={tw("modal-actions")}> 
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={() => onConfirm(paymentMethod === "cash" ? cashReceivedNumber : undefined)} disabled={!canConfirm}>{saving ? "Menyimpan..." : "Simpan Transaksi"}</Button>
        </div>
      </section>
    </div>
  );
}
