import type { AccountMutationRow, AccountRow } from "../api";
import { formatRupiah, mutationLabel } from "../lib/format";

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
  return (
    <>
      <div className="page-title">
        <div><p className="eyebrow">Saldo Virtual</p><h1>Kas & Saldo</h1></div>
        <div className="page-actions">
          <button className="secondary" onClick={onAddAccount}>Tambah Rekening</button>
          <button onClick={() => onTransfer()}>Transfer Saldo</button>
        </div>
      </div>
      <div className="page-help"><strong>Tujuan halaman:</strong><span>Pantau uang tunai, rekening bank, QRIS, dan mutasi saldo tanpa membuka internet banking.</span></div>
      <section className="stat-grid balance-grid">
        {accounts.map((account) => (
          <div key={account.id} className="balance-card">
            <span>{account.code}</span>
            <h2>{account.name}</h2>
            <strong>{formatRupiah(account.balance)}</strong>
            <small>Minimum: {formatRupiah(account.min_balance || 0)}</small>
            <div className="account-card-actions">
              <button className="secondary" onClick={() => onAdjust(account)}>Sesuaikan</button>
              <button className="secondary" onClick={() => onTransfer(account)}>Transfer</button>
              <button className="secondary" onClick={() => onOwnerDraw(account)}>Prive</button>
              <button className="secondary" onClick={() => onBankFee(account)}>Biaya</button>
            </div>
          </div>
        ))}
      </section>
      <section className="card">
        <div className="card-header"><div><h2>Mutasi Saldo Terakhir</h2><p>Riwayat perubahan kas, rekening, QRIS, biaya, dan transaksi agen.</p></div></div>
        {mutations.length === 0 ? <div className="empty-state compact"><strong>Belum ada mutasi saldo</strong><span>Mutasi muncul setelah POS, transaksi agen, atau aksi saldo.</span></div> : mutations.map((mutation) => (
          <div key={mutation.id} className="row rich-row">
            <div><strong>{mutation.account_name}</strong><small>{mutationLabel(mutation.mutation_type)} • {mutation.notes || "-"}</small></div>
            <div className="amount-stack"><strong className={mutation.amount < 0 ? "negative" : "positive"}>{formatRupiah(mutation.amount)}</strong><small>Saldo: {formatRupiah(mutation.balance_after)}</small></div>
          </div>
        ))}
      </section>
    </>
  );
}
