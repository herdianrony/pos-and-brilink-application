import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Download, Printer, Scale, Wallet } from "lucide-react";
import type { AccountMutationRow, AccountRow } from "../api";
import { formatRupiah, mutationLabel } from "../lib/format";
import { PageHeader, StatCard } from "../components/ui";

type Preset = "all" | "today" | "week" | "month";

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
    return mutations.filter((mutation) => {
      const accountMatch = selectedAccountId === "all" || String(mutation.account_id) === selectedAccountId;
      return accountMatch && inPreset(mutation.created_at, preset);
    });
  }, [mutations, preset, selectedAccountId]);

  const totalIn = filteredMutations.filter((mutation) => mutation.amount > 0).reduce((sum, mutation) => sum + mutation.amount, 0);
  const totalOut = Math.abs(filteredMutations.filter((mutation) => mutation.amount < 0).reduce((sum, mutation) => sum + mutation.amount, 0));
  const latestBalance = filteredMutations[0]?.balance_after || 0;
  const openingBalance = filteredMutations.length > 0
    ? filteredMutations[filteredMutations.length - 1].balance_after - filteredMutations[filteredMutations.length - 1].amount
    : 0;

  return (
    <div className="statement-page">
      <PageHeader
        eyebrow="Mutasi Rekening"
        title="Rekening Koran"
        description="Mutasi rekening instan — mirip rekening koran bank."
        actions={<><button className="secondary" onClick={onExportCsv} disabled={filteredMutations.length === 0}><Download size={16} /> Unduh CSV</button><button className="secondary" onClick={() => window.print()} disabled={filteredMutations.length === 0}><Printer size={16} /> Print</button></>}
      />

      <section className="statement-filter-card card">
        <label>Rekening
          <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
            <option value="all">Semua rekening</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <div>
          <span className="statement-filter-label">Periode Cepat</span>
          <div className="statement-preset-row">
            {([
              ["all", "Semua"],
              ["today", "Hari Ini"],
              ["week", "7 Hari"],
              ["month", "30 Hari"],
            ] as Array<[Preset, string]>).map(([id, label]) => (
              <button key={id} className={preset === id ? "filter-chip active" : "filter-chip"} onClick={() => setPreset(id)}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="electron-stat-grid statement-stat-grid">
        <StatCard tone="blue" icon={<Scale size={20} />} label="Saldo Awal" value={formatRupiah(openingBalance)} sub="awal periode" />
        <StatCard tone="green" icon={<ArrowDownLeft size={20} />} label="Total Masuk" value={formatRupiah(totalIn)} sub={`${filteredMutations.length} mutasi`} />
        <StatCard tone="amber" icon={<ArrowUpRight size={20} />} label="Total Keluar" value={formatRupiah(totalOut)} sub={`${filteredMutations.length} mutasi`} />
        <StatCard tone="purple" icon={<Wallet size={20} />} label="Saldo Akhir" value={formatRupiah(latestBalance)} sub="mutasi terbaru" />
      </section>

      <section className="statement-layout">
        <div className="card statement-table-card">
          <div className="card-header"><div><h2>Mutasi Rekening</h2><p>{filteredMutations.length} mutasi sesuai filter.</p></div></div>
          {filteredMutations.length === 0 ? <div className="empty-state"><strong>Belum ada mutasi</strong><span>Mutasi muncul setelah transaksi atau aksi saldo.</span></div> : (
            <div className="statement-table-like">
              <div className="statement-table-head"><span>Tanggal</span><span>Akun</span><span>Tipe</span><span>Masuk/Keluar</span><span>Saldo</span></div>
              {filteredMutations.map((mutation) => (
                <div key={mutation.id} className="statement-row-like">
                  <span><strong>{mutation.created_at}</strong><small>{mutation.notes || "-"}</small></span>
                  <span>{mutation.account_name}</span>
                  <span>{mutationLabel(mutation.mutation_type)}</span>
                  <strong className={mutation.amount < 0 ? "negative" : "positive"}>{formatRupiah(mutation.amount)}</strong>
                  <strong>{formatRupiah(mutation.balance_after)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="card statement-side-card">
          <div className="card-header"><div><h2>Saldo Rekening</h2><p>Ringkasan semua akun aktif.</p></div></div>
          {accounts.map((account) => (
            <div key={account.id} className="row rich-row">
              <div><strong>{account.name}</strong><small>{account.code}</small></div>
              <strong>{formatRupiah(account.balance)}</strong>
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}
