"use client";

import { Card, Badge, Spinner, EmptyState } from "@/components/ui";
import { formatDate, formatRupiah } from "@/lib/utils";
import { getStatusConfig, getTransactionStatus } from "@/lib/history";
import { Ban, CheckCircle, Eye, RotateCcw } from "lucide-react";
import type { TransactionActionType, Trx } from "@/types/transactions";

interface Props {
  loading: boolean;
  transactions: Trx[];
  servicesLabel: string;
  onViewDetail: (id: number) => void;
  onOpenAction: (type: TransactionActionType, transaction: Trx) => void;
}

export default function TransactionTable({ loading, transactions, servicesLabel, onViewDetail, onOpenAction }: Props) {
  return (
    <Card className="overflow-hidden">
      {loading ? <Spinner /> : transactions.length === 0 ? <EmptyState icon="clipboard-list" title="Belum ada transaksi" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/80">
              <th className="text-left p-3 font-medium">Invoice</th>
              <th className="text-left p-3 font-medium">Tipe</th>
              <th className="text-left p-3 font-medium">Detail</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Total</th>
              <th className="text-right p-3 font-medium">Profit</th>
              <th className="text-left p-3 font-medium">Waktu</th>
              <th className="text-center p-3 font-medium">Aksi</th>
            </tr></thead>
            <tbody>
              {transactions.map((transaction) => {
                const status = getTransactionStatus(transaction.status);
                const statusCfg = getStatusConfig(status);
                return (
                  <tr key={transaction.id} className="border-t border-slate-50 hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-slate-500">{transaction.invoiceNo}</td>
                    <td className="p-3"><Badge variant={transaction.type === "pos" ? "primary" : "purple"}>{transaction.type === "pos" ? "POS" : servicesLabel}</Badge></td>
                    <td className="p-3 text-slate-500 text-xs">{transaction.subType || "Penjualan"}</td>
                    <td className="p-3">
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      {transaction.referenceNo && <p className="text-[10px] text-slate-400 mt-0.5">Ref: {transaction.referenceNo}</p>}
                    </td>
                    <td className="p-3 text-right font-semibold">{formatRupiah(transaction.totalAmount)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatRupiah(transaction.profit || "0")}</td>
                    <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(transaction.createdAt)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => onViewDetail(transaction.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl" title="Lihat detail"><Eye size={14} /></button>
                      {status === "pending" && (
                        <>
                          <button onClick={() => onOpenAction("complete", transaction)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl" title="Tandai selesai"><CheckCircle size={14} /></button>
                          <button onClick={() => onOpenAction("void", transaction)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl" title="Batalkan"><Ban size={14} /></button>
                        </>
                      )}
                      {status === "completed" && transaction.type === "brilink" && (
                        <button onClick={() => onOpenAction("reverse", transaction)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-xl" title="Reverse"><RotateCcw size={14} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
