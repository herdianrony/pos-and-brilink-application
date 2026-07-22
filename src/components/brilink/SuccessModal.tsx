"use client";

import { Modal, Button } from "@/components/ui";
import { CheckCircle } from "lucide-react";

interface Props {
  open: boolean;
  invoiceNo: string;
  involvesExternalProvider?: boolean;
  onClose: () => void;
}

export default function SuccessModal({ open, invoiceNo, involvesExternalProvider, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-8 text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800">Pencatatan Berhasil</h3>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400">No. Invoice</p>
          <p className="font-mono font-bold text-lg text-primary">{invoiceNo}</p>
        </div>
        {involvesExternalProvider ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            <p className="font-semibold">Penting:</p>
            <p>Pencatatan lokal berhasil. Pastikan transfer/pembayaran ke provider sudah dilakukan via M-Banking/EDC.</p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Saldo kas & rekening telah diperbarui otomatis</p>
        )}
        <Button variant="primary" size="lg" className="w-full" onClick={onClose}>OK</Button>
      </div>
    </Modal>
  );
}
