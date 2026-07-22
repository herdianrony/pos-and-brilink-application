"use client";

import { Modal, Button, EmptyState } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";
import { Play, Trash2, X } from "lucide-react";
import type { HeldCart } from "@/lib/pos-cart";

interface Props {
  open: boolean;
  heldCarts: HeldCart[];
  onClose: () => void;
  onResume: (held: HeldCart) => void;
  onDelete: (id: string) => void;
}

export default function HeldCartsModal({ open, heldCarts, onClose, onResume, onDelete }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900">Transaksi Ditahan</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        {heldCarts.length === 0 ? (
          <EmptyState icon="clipboard-list" title="Belum ada transaksi ditahan" />
        ) : (
          <div className="space-y-2">
            {heldCarts.map((held) => {
              const heldTotal = held.cart.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
              return (
                <div key={held.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-700">{held.customerName || "Pelanggan"}</p>
                    <p className="text-xs text-slate-400">{held.cart.length} item • {formatRupiah(heldTotal)}</p>
                    <p className="text-[10px] text-slate-400">{new Date(held.timestamp).toLocaleTimeString("id-ID")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="primary" size="sm" onClick={() => onResume(held)}>
                      <Play size={14} /> Lanjut
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(held.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
