import type { AccountMutationRow, AccountRow } from "../api";
import { formatRupiah, mutationLabel } from "../lib/format";

export function StatementPage({
  accounts,
  mutations,
  onExportCsv,
}: {
  accounts: AccountRow[];
  mutations: AccountMutationRow[];
  onExportCsv: () => void;
}) {
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Mutasi</p><h1>Rekening Koran</h1></div><button className="secondary" onClick={onExportCsv}>Export CSV</button></div>
      <section className="grid dashboard-grid">
        <div className="card">
          <h2>Ringkasan Saldo</h2>
          {accounts.map((account) => (
            <div key={account.id} className="row rich-row"><div><strong>{account.name}</strong><small>{account.code}</small></div><strong>{formatRupiah(account.balance)}</strong></div>
          ))}
        </div>
        <div className="card">
          <h2>Mutasi Terakhir</h2>
          {mutations.length === 0 ? <p>Belum ada mutasi.</p> : mutations.map((mutation) => (
            <div key={mutation.id} className="row rich-row">
              <div><strong>{mutation.account_name}</strong><small>{mutationLabel(mutation.mutation_type)} • {mutation.created_at}</small></div>
              <div className="amount-stack"><strong className={mutation.amount < 0 ? "negative" : "positive"}>{formatRupiah(mutation.amount)}</strong><small>{mutation.notes || "-"}</small></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
