"use client";

import { Card, Badge, Spinner, EmptyState } from "@/components/ui";
import { DynamicIcon } from "@/components/DynamicIcon";
import { formatDate, formatRupiah, cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Account, AccountMutation as Mutation } from "@/types/models";
import type { RekeningKoranSummary } from "@/types/rekening-koran";

interface Props {
  loading: boolean;
  mutations: Mutation[];
  selectedAccount?: Account;
  startDate: string;
  endDate: string;
  summary: RekeningKoranSummary | null;
  mutationTypeLabels: Record<string, { label: string; variant: "success" | "danger" | "warning" | "primary" | "purple" | "default" }>;
}

export default function MutationTable({ loading, mutations, selectedAccount, startDate, endDate, summary, mutationTypeLabels }: Props) {
  return (
<Card className="overflow-hidden no-print">
  {/* Header bank-style — hidden in print (print has its own header) */}
  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-zinc-50 to-white no-print">
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
          style={{
            background: `linear-gradient(135deg, ${selectedAccount?.color || "#00875A"} 0%, ${selectedAccount?.color || "#00875A"}dd 100%)`,
          }}
        >
          <DynamicIcon
            name={selectedAccount?.icon}
            fallback={selectedAccount?.code === "cash" ? "wallet" : "landmark"}
            size={22}
            className="text-white"
          />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900">{selectedAccount?.name}</h3>
          <p className="text-xs text-slate-400">
            Periode: {startDate || "—"} s/d {endDate || "—"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Saldo Saat Ini</p>
        <p className="text-xl font-extrabold text-slate-900">{formatRupiah(selectedAccount?.balance || "0")}</p>
      </div>
    </div>
  </div>

  {/* Table */}
  {loading ? (
    <Spinner />
  ) : mutations.length === 0 ? (
    <EmptyState
      icon="clipboard-list"
      title="Belum ada mutasi"
      subtitle="Tidak ada transaksi pada periode ini"
    />
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">
              Tanggal
            </th>
            <th className="text-left p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">
              Keterangan
            </th>
            <th className="text-center p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">
              Tipe
            </th>
            <th className="text-right p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">
              Masuk
            </th>
            <th className="text-right p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">
              Keluar
            </th>
            <th className="text-right p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody>
          {[...mutations].reverse().map((m, idx) => {
            const amt = Number(m.amount);
            const isIn = amt > 0;
            const typeInfo = mutationTypeLabels[m.type] || { label: m.type, variant: "default" as const };
            return (
              <tr
                key={m.id}
                className={cn(
                  "border-b border-slate-50 hover:bg-emerald-50/30 transition-colors",
                  idx === 0 && "bg-amber-50/30"
                )}
              >
                <td className="p-3 text-slate-600 whitespace-nowrap text-xs">
                  {formatDate(m.createdAt)}
                </td>
                <td className="p-3 text-slate-700 max-w-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-xl flex items-center justify-center shrink-0",
                        isIn ? "bg-emerald-100" : "bg-red-100"
                      )}
                    >
                      {isIn ? (
                        <ArrowDownLeft size={12} className="text-emerald-600" />
                      ) : (
                        <ArrowUpRight size={12} className="text-red-600" />
                      )}
                    </div>
                    <span className="truncate">{m.notes || typeInfo.label}</span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                </td>
                <td className="p-3 text-right font-semibold text-emerald-600">
                  {isIn ? formatRupiah(amt) : "—"}
                </td>
                <td className="p-3 text-right font-semibold text-red-600">
                  {!isIn ? formatRupiah(Math.abs(amt)) : "—"}
                </td>
                <td className="p-3 text-right font-bold text-slate-800">
                  {formatRupiah(m.balanceAfter)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
            <td colSpan={3} className="p-3 text-right text-slate-700 uppercase text-xs tracking-wider">
              Total Periode:
            </td>
            <td className="p-3 text-right text-emerald-700">
              {summary ? formatRupiah(summary.totalIn) : "—"}
            </td>
            <td className="p-3 text-right text-red-700">
              {summary ? formatRupiah(summary.totalOut) : "—"}
            </td>
            <td className="p-3 text-right text-slate-900">
              {summary ? formatRupiah(summary.closingBalance) : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )}
</Card>
  );
}
