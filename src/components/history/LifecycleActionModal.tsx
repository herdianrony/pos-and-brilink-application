"use client";

import { Modal, Button, Input } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";
import { AlertTriangle, Ban, CheckCircle, RotateCcw } from "lucide-react";
import type { TransactionActionState } from "@/types/transactions";

interface Props {
  action: TransactionActionState | null;
  input: string;
  submitting: boolean;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

export default function LifecycleActionModal({ action, input, submitting, onClose, onInputChange, onSubmit }: Props) {
  return (
    <Modal open={!!action} onClose={onClose} size="sm">
      {action && action.trx && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            {action.type === "complete" ? (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
            ) : action.type === "void" ? (
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Ban size={20} className="text-red-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <RotateCcw size={20} className="text-amber-600" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                {action.type === "complete" ? "Tandai Selesai" : action.type === "void" ? "Batalkan Transaksi" : "Reverse Transaksi"}
              </h3>
              <p className="text-xs text-slate-400">{action.trx.invoiceNo}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">Layanan</span><span className="font-medium">{action.trx.subType || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="font-bold">{formatRupiah(action.trx.totalAmount)}</span></div>
          </div>

          {action.type === "complete" ? (
            <Input
              label="No. Referensi Provider"
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="Contoh: TRX12345678 dari M-Banking"
              autoFocus
            />
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Alasan {action.type === "void" ? "Pembatalan" : "Reversal"}</label>
              <textarea
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder={action.type === "void" ? "Contoh: Salah nominal dimasukkan" : "Contoh: Transfer gagal di provider"}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
                rows={3}
                autoFocus
              />
            </div>
          )}

          {action.type === "reverse" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Reverse akan membuat counter-mutation untuk mengembalikan saldo. Saldo historis tidak diubah. Aksi ini hanya untuk admin.</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Batal</Button>
            <Button
              variant={action.type === "complete" ? "primary" : "danger"}
              className="flex-1"
              onClick={onSubmit}
              disabled={submitting || (action.type === "complete" ? false : input.trim().length < 3)}
            >
              {submitting ? "Memproses..." : action.type === "complete" ? "Selesaikan" : action.type === "void" ? "Batalkan" : "Reverse"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
