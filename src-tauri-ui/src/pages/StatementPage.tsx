import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Download, Scale, ScrollText, Wallet } from "lucide-react";
import type { AccountMutationRow, AccountRow } from "../api";
import { formatRupiah, mutationLabel } from "../lib/format";
import { Badge, Button, Card, ChipTabs, EmptyState, StatCard } from "../components/ui";

type Preset = "all" | "today" | "week" | "month";

const presetItems: Array<{ id: Preset; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "today", label: "Hari Ini" },
  { id: "week", label: "7 Hari" },
  { id: "month", label: "30 Hari" },
];

function inPreset(dateText: string, preset: Preset) {
  if (preset === "all") return true;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const start = new Date(now);
  if (preset === "today") start.setHours(0, 0, 0, 0);
  if (preset === "week") start.setDate(now.getDate() - 7);
  if (preset === "month") start.setMonth(now.getMonth() - 1);
  return date >= start;
}

export function StatementPage({
  accounts,
  mutations,
  onExportCsv,
}: {
  accounts: AccountRow[];
  mutations: AccountMutationRow[];
  onExportCsv: () => void;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [preset, setPreset] = useState<Preset>("all");

  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      const accountMatch =
        selectedAccountId === "all" || String(m.account_id) === selectedAccountId;
      return accountMatch && inPreset(m.created_at, preset);
    });
  }, [mutations, preset, selectedAccountId]);

  const totalIn = filteredMutations
    .filter((m) => m.amount > 0)
    .reduce((s, m) => s + m.amount, 0);

  const totalOut = Math.abs(
    filteredMutations
      .filter((m) => m.amount < 0)
      .reduce((s, m) => s + m.amount, 0),
  );

  const latestBalance = filteredMutations[0]?.balance_after ?? 0;

  const openingBalance =
    filteredMutations.length > 0
      ? filteredMutations[filteredMutations.length - 1].balance_after -
        filteredMutations[filteredMutations.length - 1].amount
      : 0;

  return (
    <div className="grid gap-6 animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ScrollText size={24} className="text-blue-500" /> Rekening Koran
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Mutasi rekening instan — mirip rekening koran bank.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onExportCsv}
          disabled={filteredMutations.length === 0}
        >
          <Download size={16} /> Unduh CSV
        </Button>
      </div>

      {/* ── Filter row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Rekening
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="all">Semua rekening</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Periode
          </label>
          <ChipTabs
            items={presetItems}
            active={preset}
            onChange={setPreset}
            ariaLabel="Filter periode"
          />
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <section className="grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
        <StatCard
          color="bg-blue-50 text-blue-600"
          icon={<Scale size={20} />}
          label="Saldo Awal"
          value={formatRupiah(openingBalance)}
          sub="awal periode"
        />
        <StatCard
          color="bg-emerald-50 text-emerald-600"
          icon={<ArrowDownLeft size={20} />}
          label="Mutasi Masuk"
          value={formatRupiah(totalIn)}
          sub={`${filteredMutations.filter((m) => m.amount > 0).length} mutasi`}
        />
        <StatCard
          color="bg-amber-50 text-amber-600"
          icon={<ArrowUpRight size={20} />}
          label="Mutasi Keluar"
          value={formatRupiah(totalOut)}
          sub={`${filteredMutations.filter((m) => m.amount < 0).length} mutasi`}
        />
        <StatCard
          color="bg-teal-50 text-teal-600"
          icon={<Wallet size={20} />}
          label="Saldo Akhir"
          value={formatRupiah(latestBalance)}
          sub="mutasi terbaru"
        />
      </section>

      {/* ── Mutation history table ── */}
      <Card className="overflow-hidden">
        {filteredMutations.length === 0 ? (
          <EmptyState
            title="Belum ada mutasi"
            description="Mutasi muncul setelah transaksi atau aksi saldo."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Rekening Koran</caption>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Akun
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Masuk / Keluar
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMutations.map((m) => (
                  <tr
                    key={m.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{m.created_at}</div>
                      {m.notes && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {m.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {m.account_name}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="secondary">
                        {mutationLabel(m.mutation_type)}
                      </Badge>
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-bold ${
                        m.amount < 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {formatRupiah(m.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatRupiah(m.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
