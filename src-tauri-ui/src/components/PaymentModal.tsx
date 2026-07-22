import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Banknote, CheckCircle2, CreditCard, Keyboard, QrCode, X } from "lucide-react";
import type { AccountRow } from "../api";
import { formatRupiah } from "../lib/format";
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
  const modalRef = useRef<HTMLElement>(null);
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
    modalRef.current?.addEventListener("keydown", handler);
    return () => modalRef.current?.removeEventListener("keydown", handler);
  }, [canConfirm, cashReceivedNumber, onClose, onConfirm, onPaymentMethodChange, open, paymentMethod]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[80] grid min-h-[calc(100vh-64px)] place-items-center bg-slate-900/55 p-6 print:bg-white print:p-0">
      <section ref={modalRef} className="max-h-[calc(100vh-48px)] w-[min(620px,100%)] overflow-auto rounded-3xl bg-white p-5.5 shadow-[0_30px_90px_rgba(15,23,42,.35)]" role="dialog" aria-modal="true" aria-label="Konfirmasi Pembayaran" tabIndex={-1}> 
        <CardHeader>
          <div><p className="m-0 mb-2 text-xs font-black uppercase tracking-[0.14em] text-primary">Pembayaran POS</p><h2>Konfirmasi Pembayaran</h2></div>
          <Button variant="secondary" className="h-10 w-10 p-0" onClick={onClose} title="Tutup" aria-label="Tutup modal pembayaran"><X size={18} /></Button>
        </CardHeader>

        <div className="mb-4 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-900 p-5 text-white [&_span]:text-sm [&_span]:font-bold [&_span]:text-emerald-100 [&_strong]:block [&_strong]:text-4xl [&_strong]:font-black [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-emerald-100/80">
          <span>Total Belanja</span>
          <strong>{formatRupiah(total)}</strong>
          <small>{itemCount} item dalam keranjang</small>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3 max-[560px]:grid-cols-1"> 
          {methods.map((method) => {
            const MethodIcon = method.icon;
            return (
              <button key={method.id} type="button" className={paymentMethod === method.id ? "grid min-h-[96px] content-center justify-items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white p-3 text-center text-slate-800 shadow-none hover:border-primary-light/30 hover:bg-primary-light/10 hover:translate-y-0 [&_svg]:text-primary [&_strong]:font-black [&_small]:rounded-full [&_small]:bg-slate-100 [&_small]:px-2 [&_small]:py-0.5 [&_small]:text-[10px] [&_small]:font-black [&_small]:text-slate-500 border-primary bg-primary-light/10 text-primary-dark" : "grid min-h-[96px] content-center justify-items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white p-3 text-center text-slate-800 shadow-none hover:border-primary-light/30 hover:bg-primary-light/10 hover:translate-y-0 [&_svg]:text-primary [&_strong]:font-black [&_small]:rounded-full [&_small]:bg-slate-100 [&_small]:px-2 [&_small]:py-0.5 [&_small]:text-[10px] [&_small]:font-black [&_small]:text-slate-500"} onClick={() => onPaymentMethodChange(method.id)}>
                <MethodIcon size={22} />
                <strong>{method.label}</strong>
                <small>{method.hint}</small>
              </button>
            );
          })}
        </div>

        {paymentMethod === "cash" ? (
          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"> 
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Uang Diterima
              <CurrencyInput value={cashReceived} onChange={setCashReceived} />
            </label>
            <div className="grid grid-cols-3 gap-2 max-[560px]:grid-cols-2"> 
              {cashShortcuts.map((amount) => (
                <button key={amount} type="button" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-700 shadow-none hover:bg-slate-100" onClick={() => setCashReceived(String(amount))}>{amount === total ? "Uang Pas" : formatRupiah(amount)}</button>
              ))}
            </div>
            <div className={changeAmount >= 0 ? "flex items-center justify-between gap-3 rounded-2xl border p-4 [&_span]:text-sm [&_span]:font-black [&_strong]:text-2xl [&_strong]:font-black border-emerald-200 bg-emerald-50 text-emerald-800" : "flex items-center justify-between gap-3 rounded-2xl border p-4 [&_span]:text-sm [&_span]:font-black [&_strong]:text-2xl [&_strong]:font-black bg-amber-50 text-amber-700"}> 
              <span className="flex items-center gap-2">{changeAmount >= 0 ? <><CheckCircle2 size={16} className="text-success" /> Kembalian</> : <><AlertTriangle size={16} className="text-amber-500" /> Uang Kurang</>}</span>
              <strong>{formatRupiah(Math.abs(changeAmount))}</strong>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"> 
            <label htmlFor="settlement-account" className="grid gap-2 text-[13px] font-black text-slate-600">Rekening Penerima
              <select id="settlement-account" className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" value={settlementAccountId} onChange={(event) => onSettlementAccountChange(event.target.value)}>
                <option value="">Pilih rekening</option>
                {settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-primary-light/30 bg-primary-light/10 p-4 text-sm font-bold text-primary-dark [&_svg]:flex-none"><CheckCircle2 size={18} /><span>Saldo akan masuk ke rekening yang dipilih setelah transaksi disimpan.</span></div>
          </div>
        )}

        <div className="my-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-3 text-sm font-bold text-slate-500 [&_svg]:flex-none"> 
          <Keyboard size={16} />
          <span>Shortcut: F2 Tunai • F3 Transfer • F4 QRIS • Enter Simpan • Esc Batal</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden"> 
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={() => onConfirm(paymentMethod === "cash" ? cashReceivedNumber : undefined)} disabled={!canConfirm}>{saving ? "Menyimpan..." : "Simpan Transaksi"}</Button>
        </div>
      </section>
    </div>
  );
}
