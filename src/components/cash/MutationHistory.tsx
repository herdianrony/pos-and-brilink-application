"use client";

import { Card, Badge, EmptyState } from "@/components/ui";
import { formatDate, formatRupiah, cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";
import { Clock } from "lucide-react";
import type { Account, AccountMutation } from "@/types/models";

const typeLabels: Record<
  string,
  {
    label: string;
    color: "success" | "danger" | "primary" | "warning" | "purple" | "default";
  }
> = {
  opening: { label: "Saldo Awal", color: "primary" },
  pos: { label: "POS", color: "success" },
  brilink: { label: "BRILink", color: "purple" },
  brilink_fee: { label: "Fee BRILink", color: "success" },
  transfer_in: { label: "Transfer Masuk", color: "success" },
  transfer_out: { label: "Transfer Keluar", color: "danger" },
  adjustment_in: { label: "Penambahan", color: "success" },
  adjustment_out: { label: "Pengurangan", color: "danger" },
  adjustment: { label: "Penyesuaian", color: "warning" },
  owner_draw: { label: "Prive Owner", color: "danger" },
};

interface Props {
  accounts: Account[];
  mutations: AccountMutation[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MutationHistory({
  accounts,
  mutations,
  activeTab,
  onTabChange,
}: Props) {
  const filteredMutations =
    activeTab === "all"
      ? mutations
      : mutations.filter(
          (mutation) => mutation.accountId.toString() === activeTab,
        );

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-slate-50 flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-extrabold text-slate-700 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" /> Riwayat Mutasi
        </h3>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => onTabChange("all")}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-medium",
              activeTab === "all"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            Semua
          </button>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => onTabChange(account.id.toString())}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-medium",
                activeTab === account.id.toString()
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {isBankIcon(account.icon) ? (
                <BankIcon
                  name={account.icon}
                  size={16}
                  className="inline-block -mt-0.5 mr-1"
                />
              ) : (
                <DynamicIcon
                  name={account.icon}
                  fallback="package"
                  size={14}
                  className="inline-block -mt-0.5 mr-1"
                />
              )}
              {account.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>
      {filteredMutations.length === 0 ? (
        <EmptyState icon="clipboard-list" title="Belum ada mutasi" />
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="text-left p-3 font-medium">Waktu</th>
                <th className="text-left p-3 font-medium">Akun</th>
                <th className="text-left p-3 font-medium">Tipe</th>
                <th className="text-right p-3 font-medium">Jumlah</th>
                <th className="text-right p-3 font-medium">Saldo</th>
                <th className="text-left p-3 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {filteredMutations.map((mutation) => {
                const label = typeLabels[mutation.type] || {
                  label: mutation.type,
                  color: "default" as const,
                };
                const amount = Number(mutation.amount);
                const isPositive = amount >= 0;
                return (
                  <tr
                    key={mutation.id}
                    className="border-t border-slate-50 hover:bg-emerald-50/30"
                  >
                    <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(mutation.createdAt)}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span>{mutation.accountIcon}</span>
                        <span className="text-xs truncate max-w-[80px]">
                          {mutation.accountName}
                        </span>
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant={label.color}>{label.label}</Badge>
                    </td>
                    <td
                      className={cn(
                        "p-3 text-right font-semibold",
                        isPositive ? "text-emerald-600" : "text-red-500",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatRupiah(mutation.amount)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700">
                      {formatRupiah(mutation.balanceAfter)}
                    </td>
                    <td className="p-3 text-slate-500 text-xs max-w-xs truncate">
                      {mutation.notes || "—"}
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
