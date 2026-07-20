import { ArrowRightLeft, HandCoins, Plus, ReceiptText, Wallet } from "lucide-react";
import type { AccountMutationRow, AccountRow } from "../api";
import { formatRupiah, mutationLabel } from "../lib/format";

function accountTone(index: number, code: string) {
  if (code === "cash") return "cash-account-green";
  return ["cash-account-blue", "cash-account-navy", "cash-account-purple", "cash-account-teal"][index % 4];
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
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const cashAccount = accounts.find((account) => account.code === "cash");
  const nonCashAccounts = accounts.filter((account) => account.code !== "cash");
  const incomingTotal = mutations.filter((mutation) => mutation.amount > 0).reduce((sum, mutation) => sum + mutation.amount, 0);
  const outgoingTotal = Math.abs(mutations.filter((mutation) => mutation.amount < 0).reduce((sum, mutation) => sum + mutation.amount, 0));

  return (
    <>
      <div className="page-title cash-page-title">
        <div>
          <p className="eyebrow">Keuangan</p>
          <h1>Kas & Saldo</h1>
          <p className="m-0 text-sm font-semibold text-slate-400">Pantau kas tunai, rekening bank, QRIS, dan riwayat mutasi.</p>
        </div>
        <div className="page-actions">
          <button className="secondary" onClick={onAddAccount}><Plus size={16} /> Tambah Rekening</button>
          <button onClick={() => onTransfer()}><ArrowRightLeft size={16} /> Transfer Saldo</button>
        </div>
      </div>

      <section className="cash-summary-grid">
        <div className="cash-total-card">
          <span>Total Saldo Aktif</span>
          <strong>{formatRupiah(totalBalance)}</strong>
          <small>{accounts.length} akun aktif</small>
        </div>
        <div className="cash-summary-card"><Wallet size={20} /><div><span>Kas Tunai</span><strong>{formatRupiah(cashAccount?.balance || 0)}</strong></div></div>
        <div className="cash-summary-card"><Plus size={20} /><div><span>Mutasi Masuk</span><strong>{formatRupiah(incomingTotal)}</strong></div></div>
        <div className="cash-summary-card"><ReceiptText size={20} /><div><span>Mutasi Keluar</span><strong>{formatRupiah(outgoingTotal)}</strong></div></div>
      </section>

      <section className="cash-section-head">
        <div>
          <strong>Saldo Rekening</strong>
          <span>Gunakan tombol di kartu untuk aksi saldo.</span>
        </div>
        <small>{accounts.length} akun</small>
      </section>

      <section className="cash-account-grid">
        {accounts.map((account, index) => (
          <article key={account.id} className={`cash-account-card ${accountTone(index, account.code)}`}>
            <div className="cash-account-top">
              <span>{account.code === "cash" ? "Kas Tunai" : "Rekening"}</span>
              <Wallet size={18} />
            </div>
            <h2>{account.name}</h2>
            <small>Saldo Tercatat</small>
            <strong>{formatRupiah(account.balance)}</strong>
            <p>Minimum: {formatRupiah(account.min_balance || 0)}</p>
            <div className="cash-account-actions">
              <button onClick={() => onAdjust(account)}>Sesuaikan</button>
              <button onClick={() => onTransfer(account)}>Transfer</button>
              <button onClick={() => onOwnerDraw(account)}><HandCoins size={13} /> Owner</button>
              <button onClick={() => onBankFee(account)}>Biaya</button>
            </div>
          </article>
        ))}
      </section>

      <section className="cash-layout-grid">
        <div className="card cash-mutation-card">
          <div className="card-header"><div><h2>Mutasi Saldo Terakhir</h2><p>Riwayat perubahan kas, rekening, QRIS, biaya, dan transaksi agen.</p></div></div>
          {mutations.length === 0 ? <div className="empty-state compact"><strong>Belum ada mutasi saldo</strong><span>Mutasi muncul setelah POS, transaksi agen, atau aksi saldo.</span></div> : (
            <div className="cash-mutation-table">
              <div className="cash-mutation-head"><span>Akun</span><span>Tipe</span><span>Nominal</span><span>Saldo</span></div>
              {mutations.map((mutation) => (
                <div key={mutation.id} className="cash-mutation-row">
                  <span><strong>{mutation.account_name}</strong><small>{mutation.notes || "-"}</small></span>
                  <span>{mutationLabel(mutation.mutation_type)}<small>{mutation.created_at}</small></span>
                  <strong className={mutation.amount < 0 ? "negative" : "positive"}>{formatRupiah(mutation.amount)}</strong>
                  <strong>{formatRupiah(mutation.balance_after)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="card cash-side-panel">
          <div className="card-header"><div><h2>Rekening Non-Tunai</h2><p>Bank, QRIS, dan saldo provider.</p></div></div>
          {nonCashAccounts.length === 0 ? <div className="empty-state compact"><strong>Belum ada rekening</strong><span>Tambahkan rekening bank atau QRIS.</span></div> : nonCashAccounts.map((account) => (
            <div key={account.id} className="row rich-row">
              <div><strong>{account.name}</strong><small>{account.code}</small></div>
              <strong>{formatRupiah(account.balance)}</strong>
            </div>
          ))}
        </aside>
      </section>
    </>
  );
}
