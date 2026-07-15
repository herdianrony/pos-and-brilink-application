"use client";

import { Card, Button } from "@/components/ui";
import { AccountCard } from "@/components/AccountCard";
import { formatRupiah } from "@/lib/utils";
import { Plus, ArrowRightLeft } from "lucide-react";
import type { Account } from "@/types/models";

export type CashModalType =
  | "adjust"
  | "transfer"
  | "add_account"
  | "edit_account"
  | null;

interface Props {
  activeAccounts: Account[];
  inactiveAccounts: Account[];
  showInactive: boolean;
  onToggleInactive: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
  onSelectAccount: (account: Account) => void;
  onOpenModal: (modal: CashModalType) => void;
}

export default function AccountBalanceOverview({
  activeAccounts,
  inactiveAccounts,
  showInactive,
  onToggleInactive,
  onEditAccount,
  onDeleteAccount,
  onSelectAccount,
  onOpenModal,
}: Props) {
  const totalBalance = activeAccounts.reduce(
    (sum, account) => sum + parseFloat(account.balance),
    0,
  );

  return (
    <>
      <Card className="p-4 bg-linear-to-r from-emerald-500 to-teal-500 text-white">
        <p className="text-emerald-100 text-sm">Total Saldo Aktif</p>
        <p className="text-3xl font-extrabold">{formatRupiah(totalBalance)}</p>
        <p className="text-emerald-200 text-xs mt-1">
          {activeAccounts.length} akun aktif
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeAccounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onEdit={() => onEditAccount(account)}
            onDelete={
              !account.code || account.code !== "cash"
                ? () => onDeleteAccount(account)
                : undefined
            }
            actions={
              <>
                <button
                  onClick={() => {
                    onSelectAccount(account);
                    onOpenModal("adjust");
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Sesuaikan
                </button>
                <button
                  onClick={() => {
                    onSelectAccount(account);
                    onOpenModal("transfer");
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft size={14} /> Transfer
                </button>
              </>
            }
          />
        ))}
      </div>

      {inactiveAccounts.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={onToggleInactive}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between text-sm font-medium text-slate-600"
          >
            <span>Rekening Nonaktif ({inactiveAccounts.length})</span>
            <span className="text-xs text-slate-400">
              {showInactive ? "Sembunyikan" : "Tampilkan"}
            </span>
          </button>
          {showInactive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
              {inactiveAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={() => onEditAccount(account)}
                  onDelete={undefined}
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 bg-white/15 hover:bg-white/25 text-white"
                      onClick={() => onEditAccount(account)}
                    >
                      Aktifkan
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
