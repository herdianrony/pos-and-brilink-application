import { useState } from "react";
import { ArrowRightLeft, Clock, HandCoins, Plus, ReceiptText, Wallet } from "lucide-react";
import type { AccountMutationRow, AccountRow } from "../api";
import { Badge, Button, Card, EmptyState, Tabs } from "../components/ui";
import { formatRupiah, mutationLabel } from "../lib/format";

const tabItems = [
  { id: "balance", label: "Kas & Saldo" },
  { id: "mutations", label: "Mutasi" },
  { id: "owner_draw", label: "Tarik Owner" },
  { id: "bank_fee", label: "Biaya Bank" },
];

function accountGradient(index: number, code: string) {
  if (code === "cash") return "bg-gradient-to-br from-emerald-500 to-emerald-700";
  const gradients = [
    "bg-gradient-to-br from-cyan-700 to-sky-600",
    "bg-gradient-to-br from-slate-900 to-teal-700",
    "bg-gradient-to-br from-teal-400 to-teal-700",
    "bg-gradient-to-br from-teal-700 to-teal-400",
  ];
  return gradients[index % gradients.length];
}

function mutationBadgeColor(type: string): "default" | "success" | "danger" | "warning" | "primary" | "purple" | "secondary" {
  if (type.startsWith("pos") || type.includes("_in")) return "success";
  if (type === "owner_draw" || type === "bank_fee" || type.includes("_out")) return "danger";
  if (type === "adjustment") return "warning";
  if (type.includes("brilink")) return "purple";
  if (type === "initial_balance") return "primary";
  return "default";
}

export function CashBalancePage({
  accounts,
  mutations,
  onAddAccount,
  onTransfer,
  onAdjust,
  onOwnerDraw,
  onBankFee,
}: {
  accounts: AccountRow[];
  mutations: AccountMutationRow[];
  onAddAccount: () => void;
  onTransfer: (account?: AccountRow) => void;
  onAdjust: (account: AccountRow) => void;
  onOwnerDraw: (account: AccountRow) => void;
  onBankFee: (account: AccountRow) => void;
}) {
  const [activeTab, setActiveTab] = useState("balance");

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const cashAccount = accounts.find((a) => a.code === "cash");
  const nonCashAccounts = accounts.filter((a) => a.code !== "cash");

  const incomingTotal = mutations
    .filter((m) => m.amount > 0)
    .reduce((sum, m) => sum + m.amount, 0);
  const outgoingTotal = Math.abs(
    mutations
      .filter((m) => m.amount < 0)
      .reduce((sum, m) => sum + m.amount, 0),
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Kas & Saldo</h2>
          <p className="text-sm text-slate-400">
            Pantau kas tunai, rekening bank, QRIS, dan riwayat mutasi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onAddAccount}>
            <Plus size={16} /> Tambah Rekening
          </Button>
          <Button onClick={() => onTransfer()}>
            <ArrowRightLeft size={16} /> Transfer Saldo
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        items={tabItems}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Tab kas & saldo"
      />

      {/* ── Tab: Kas & Saldo ── */}
      {activeTab === "balance" && (
        <div className="space-y-5" role="tabpanel" aria-label="Kas dan Saldo">
          {/* Total Balance Hero Card */}
          <Card className="p-5 bg-linear-to-r from-emerald-500 to-teal-500 text-white hover:shadow-pop">
            <p className="text-emerald-100 text-sm font-bold">Total Saldo Aktif</p>
            <p className="text-3xl font-extrabold">{formatRupiah(totalBalance)}</p>
            <p className="text-emerald-200 text-xs mt-1">
              {accounts.length} akun aktif
            </p>
          </Card>

          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex items-center gap-3 p-5">
              <Wallet size={20} className="text-emerald-600 shrink-0" />
              <div>
                <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Kas Tunai</span>
                <strong className="block text-lg font-black text-slate-950">{formatRupiah(cashAccount?.balance || 0)}</strong>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-5">
              <Plus size={20} className="text-emerald-600 shrink-0" />
              <div>
                <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Mutasi Masuk</span>
                <strong className="block text-lg font-black text-slate-950">{formatRupiah(incomingTotal)}</strong>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-5">
              <ReceiptText size={20} className="text-emerald-600 shrink-0" />
              <div>
                <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Mutasi Keluar</span>
                <strong className="block text-lg font-black text-slate-950">{formatRupiah(outgoingTotal)}</strong>
              </div>
            </Card>
          </div>

          {/* Section Title */}
          <div className="flex items-center justify-between">
            <div>
              <strong className="block text-sm font-black uppercase tracking-wide text-slate-600">Saldo Rekening</strong>
              <span className="text-xs font-semibold text-slate-400">Gunakan tombol di kartu untuk aksi saldo.</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">{accounts.length} akun</span>
          </div>

          {/* Account Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account, index) => (
              <div
                key={account.id}
                className={`rounded-3xl p-5 text-white shadow-[0_14px_34px_rgba(15,23,42,.16)] ${accountGradient(index, account.code)}`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wide text-white/70">
                    {account.code === "cash" ? "Kas Tunai" : "Rekening"}
                  </span>
                  <Wallet size={18} className="text-white/70" />
                </div>
                <h3 className="text-xl font-black mb-3">{account.name}</h3>
                <small className="text-white/70">Saldo Tercatat</small>
                <strong className="block text-2xl font-black">{formatRupiah(account.balance)}</strong>
                <p className="text-xs text-white/70 mt-1">Minimum: {formatRupiah(account.min_balance || 0)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onAdjust(account)}
                    className="rounded-xl bg-white/15 px-3 py-2.5 text-xs font-bold text-white shadow-none hover:translate-y-0 hover:bg-white/25 hover:shadow-none transition-colors"
                  >
                    Sesuaikan
                  </button>
                  <button
                    onClick={() => onTransfer(account)}
                    className="rounded-xl bg-white/15 px-3 py-2.5 text-xs font-bold text-white shadow-none hover:translate-y-0 hover:bg-white/25 hover:shadow-none transition-colors"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => onOwnerDraw(account)}
                    className="rounded-xl bg-white/15 px-3 py-2.5 text-xs font-bold text-white shadow-none hover:translate-y-0 hover:bg-white/25 hover:shadow-none transition-colors flex items-center justify-center gap-1"
                  >
                    <HandCoins size={13} /> Owner
                  </button>
                  {account.code !== "cash" && (
                    <button
                      onClick={() => onBankFee(account)}
                      className="rounded-xl bg-white/15 px-3 py-2.5 text-xs font-bold text-white shadow-none hover:translate-y-0 hover:bg-white/25 hover:shadow-none transition-colors"
                    >
                      Biaya
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Mutasi ── */}
      {activeTab === "mutations" && (
        <Card className="overflow-hidden" role="tabpanel" aria-label="Mutasi">
          <div className="p-4 border-b border-slate-50 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <h3 className="font-extrabold text-slate-700">Riwayat Mutasi</h3>
          </div>
          {mutations.length === 0 ? (
            <EmptyState title="Belum ada mutasi" description="Mutasi muncul setelah POS, transaksi agen, atau aksi saldo." />
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <caption className="sr-only">Riwayat Mutasi Rekening</caption>
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
                  {mutations.map((m) => {
                    const isPositive = m.amount >= 0;
                    return (
                      <tr key={m.id} className="border-t border-slate-50 hover:bg-success-light/10">
                        <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{m.created_at}</td>
                        <td className="p-3 text-slate-600 text-xs truncate max-w-[100px]">{m.account_name}</td>
                        <td className="p-3">
                          <Badge variant={mutationBadgeColor(m.mutation_type)}>
                            {mutationLabel(m.mutation_type)}
                          </Badge>
                        </td>
                        <td className={`p-3 text-right font-semibold ${isPositive ? "text-success" : "text-red-500"}`}>
                          {isPositive ? "+" : ""}{formatRupiah(m.amount)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-700">{formatRupiah(m.balance_after)}</td>
                        <td className="p-3 text-slate-500 text-xs max-w-xs truncate">{m.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Tarik Owner ── */}
      {activeTab === "owner_draw" && (
        <div className="space-y-4" role="tabpanel" aria-label="Tarik Owner">
          <Card className="p-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
              <p className="font-bold">Prive / penarikan laba</p>
              <p className="text-xs mt-1">
                Mencatat uang yang diambil owner dari rekening. Ini bukan biaya operasional
                dan tidak mengubah profit transaksi, hanya mengurangi saldo akun.
              </p>
            </div>
            <p className="text-sm text-slate-500 mb-4">Pilih rekening untuk mencatat ambil profit owner:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <Card key={account.id} className="flex items-center justify-between p-4">
                  <div>
                    <strong className="block text-sm text-slate-800">{account.name}</strong>
                    <span className="text-xs text-slate-400">{formatRupiah(account.balance)}</span>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => onOwnerDraw(account)}
                    className="text-xs"
                  >
                    <HandCoins size={14} /> Ambil Profit
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Biaya Bank ── */}
      {activeTab === "bank_fee" && (
        <div className="space-y-4" role="tabpanel" aria-label="Biaya Bank">
          <Card className="p-5">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 mb-4">
              <p className="font-bold">Catat potongan rekening</p>
              <p className="text-xs mt-1">
                Untuk biaya admin bulanan, biaya transfer, biaya kartu, atau MDR QRIS.
                Saldo rekening akan berkurang, tetapi profit transaksi tidak berubah.
              </p>
            </div>
            <p className="text-sm text-slate-500 mb-4">Pilih rekening untuk mencatat biaya bank:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nonCashAccounts.length === 0 ? (
                <EmptyState title="Belum ada rekening non-tunai" description="Tambahkan rekening bank atau QRIS terlebih dahulu." />
              ) : (
                nonCashAccounts.map((account) => (
                  <Card key={account.id} className="flex items-center justify-between p-4">
                    <div>
                      <strong className="block text-sm text-slate-800">{account.name}</strong>
                      <span className="text-xs text-slate-400">{formatRupiah(account.balance)}</span>
                    </div>
                    <Button
                      variant="danger"
                      onClick={() => onBankFee(account)}
                      className="text-xs"
                    >
                      <ReceiptText size={14} /> Catat Biaya
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
