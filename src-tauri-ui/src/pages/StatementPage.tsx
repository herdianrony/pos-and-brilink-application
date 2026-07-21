import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Download, Printer, Scale, Wallet } from "lucide-react";
import type { AccountMutationRow, AccountRow } from "../api";
import { formatRupiah, mutationLabel } from "../lib/format";
import { Card, Button, DataCell, DataCellText, DataRow, DataTable, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { tw } from "../lib/tw";

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
    <div className={tw("statement-page")}>
      <PageHeader
        eyebrow="Mutasi Rekening"
        title="Rekening Koran"
        description="Mutasi rekening instan — mirip rekening koran bank."
        actions={<><Button variant="secondary" onClick={onExportCsv} disabled={filteredMutations.length === 0}><Download size={16} /> Unduh CSV</Button><Button variant="secondary" onClick={() => window.print()} disabled={filteredMutations.length === 0}><Printer size={16} /> Print</Button></>}
      />

      <Card className={tw("statement-filter-card")}>
        <label className={tw("field-label")}>Rekening
          <select className={tw("form-input")} value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
            <option value="all">Semua rekening</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <div>
          <span className={tw("statement-filter-label")}>Periode Cepat</span>
          <div className={tw("statement-preset-row")}>
            {([
              ["all", "Semua"],
              ["today", "Hari Ini"],
              ["week", "7 Hari"],
              ["month", "30 Hari"],
            ] as Array<[Preset, string]>).map(([id, label]) => (
              <button key={id} className={tw(preset === id ? "filter-chip active" : "filter-chip")} onClick={() => setPreset(id)}>{label}</button>
            ))}
          </div>
        </div>
      </Card>

      <section className={tw("electron-stat-grid statement-stat-grid")}>
        <StatCard tone="blue" icon={<Scale size={20} />} label="Saldo Awal" value={formatRupiah(openingBalance)} sub="awal periode" />
        <StatCard tone="green" icon={<ArrowDownLeft size={20} />} label="Total Masuk" value={formatRupiah(totalIn)} sub={`${filteredMutations.length} mutasi`} />
        <StatCard tone="amber" icon={<ArrowUpRight size={20} />} label="Total Keluar" value={formatRupiah(totalOut)} sub={`${filteredMutations.length} mutasi`} />
        <StatCard tone="teal" icon={<Wallet size={20} />} label="Saldo Akhir" value={formatRupiah(latestBalance)} sub="mutasi terbaru" />
      </section>

      <section className={tw("statement-layout")}>
        <SectionCard className={tw("statement-table-card")} title="Mutasi Rekening" description={`${filteredMutations.length} mutasi sesuai filter.`}>
          {filteredMutations.length === 0 ? <EmptyState title="Belum ada mutasi" description="Mutasi muncul setelah transaksi atau aksi saldo." /> : (
            <DataTable columns={["Tanggal", "Akun", "Tipe", "Masuk/Keluar", "Saldo"]} template="minmax(0,1.1fr) 140px 160px 130px 130px" minWidth={900}>
              {filteredMutations.map((mutation) => (
                <DataRow key={mutation.id} template="minmax(0,1.1fr) 140px 160px 130px 130px">
                  <DataCell><strong>{mutation.created_at}</strong><DataCellText>{mutation.notes || "-"}</DataCellText></DataCell>
                  <span>{mutation.account_name}</span>
                  <span>{mutationLabel(mutation.mutation_type)}</span>
                  <strong className={tw(mutation.amount < 0 ? "negative" : "positive")}>{formatRupiah(mutation.amount)}</strong>
                  <strong>{formatRupiah(mutation.balance_after)}</strong>
                </DataRow>
              ))}
            </DataTable>
          )}
        </SectionCard>
        <SectionCard className={tw("statement-side-card")} title="Saldo Rekening" description="Ringkasan semua akun aktif.">
          {accounts.map((account) => (
            <div key={account.id} className={tw("row rich-row")}>
              <div><strong>{account.name}</strong><small>{account.code}</small></div>
              <strong>{formatRupiah(account.balance)}</strong>
            </div>
          ))}
        </SectionCard>
      </section>
    </div>
  );
}
