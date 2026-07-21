import { ArrowRightLeft, HandCoins, Plus, ReceiptText, Wallet } from "lucide-react";
import type { AccountMutationRow, AccountRow } from "../api";
import { Button, DataCell, DataCellText, DataRow, DataTable, EmptyState, PageHeader, SectionCard } from "../components/ui";
import { formatRupiah, mutationLabel } from "../lib/format";

function accountTone(index: number, code: string) {
  if (code === "cash") return "bg-gradient-to-br from-emerald-500 to-emerald-700";
  return ["bg-gradient-to-br from-cyan-700 to-sky-600", "bg-gradient-to-br from-slate-900 to-teal-700", "bg-gradient-to-br from-teal-400 to-teal-700", "bg-gradient-to-br from-teal-700 to-teal-400"][index % 4];
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
      <PageHeader
        eyebrow="Keuangan"
        title="Kas & Saldo"
        description="Pantau kas tunai, rekening bank, QRIS, dan riwayat mutasi."
        actions={<><Button variant="secondary" onClick={onAddAccount}><Plus size={16} /> Tambah Rekening</Button><Button onClick={() => onTransfer()}><ArrowRightLeft size={16} /> Transfer Saldo</Button></>}
      />

      <section className="mb-5 grid grid-cols-[minmax(260px,1.15fr)_repeat(3,minmax(0,.75fr))] gap-4 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-[0_12px_30px_rgba(16,185,129,.25)] [&_span]:text-sm [&_span]:font-bold [&_span]:text-emerald-100 [&_strong]:block [&_strong]:text-3xl [&_strong]:font-black [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:font-semibold [&_small]:text-emerald-100">
          <span>Total Saldo Aktif</span>
          <strong>{formatRupiah(totalBalance)}</strong>
          <small>{accounts.length} akun aktif</small>
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,.05)] [&_svg]:text-emerald-600 [&_span]:block [&_span]:text-xs [&_span]:font-black [&_span]:uppercase [&_span]:tracking-wide [&_span]:text-slate-400 [&_strong]:block [&_strong]:text-lg [&_strong]:font-black [&_strong]:text-slate-950"><Wallet size={20} /><div><span>Kas Tunai</span><strong>{formatRupiah(cashAccount?.balance || 0)}</strong></div></div>
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,.05)] [&_svg]:text-emerald-600 [&_span]:block [&_span]:text-xs [&_span]:font-black [&_span]:uppercase [&_span]:tracking-wide [&_span]:text-slate-400 [&_strong]:block [&_strong]:text-lg [&_strong]:font-black [&_strong]:text-slate-950"><Plus size={20} /><div><span>Mutasi Masuk</span><strong>{formatRupiah(incomingTotal)}</strong></div></div>
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,.05)] [&_svg]:text-emerald-600 [&_span]:block [&_span]:text-xs [&_span]:font-black [&_span]:uppercase [&_span]:tracking-wide [&_span]:text-slate-400 [&_strong]:block [&_strong]:text-lg [&_strong]:font-black [&_strong]:text-slate-950"><ReceiptText size={20} /><div><span>Mutasi Keluar</span><strong>{formatRupiah(outgoingTotal)}</strong></div></div>
      </section>

      <section className="mb-3 flex items-center justify-between [&_strong]:block [&_strong]:text-sm [&_strong]:font-black [&_strong]:uppercase [&_strong]:tracking-wide [&_strong]:text-slate-600 [&_span]:text-xs [&_span]:font-semibold [&_span]:text-slate-400 [&_small]:text-xs [&_small]:font-semibold [&_small]:text-slate-400">
        <div>
          <strong>Saldo Rekening</strong>
          <span>Gunakan tombol di kartu untuk aksi saldo.</span>
        </div>
        <small>{accounts.length} akun</small>
      </section>

      <section className="mb-5 grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
        {accounts.map((account, index) => (
          <article key={account.id} className={`rounded-3xl p-5 text-white shadow-[0_14px_34px_rgba(15,23,42,.16)] [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-black [&_small]:text-white/70 [&>strong]:block [&>strong]:text-2xl [&>strong]:font-black [&_p]:m-0 [&_p]:text-xs [&_p]:text-white/70 ${accountTone(index, account.code)}`}>
            <div className="mb-5 flex items-center justify-between [&_span]:text-xs [&_span]:font-black [&_span]:uppercase [&_span]:tracking-wide [&_span]:text-white/70">
              <span>{account.code === "cash" ? "Kas Tunai" : "Rekening"}</span>
              <Wallet size={18} />
            </div>
            <h2>{account.name}</h2>
            <small>Saldo Tercatat</small>
            <strong>{formatRupiah(account.balance)}</strong>
            <p>Minimum: {formatRupiah(account.min_balance || 0)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 [&_button]:rounded-xl [&_button]:bg-white/15 [&_button]:px-2 [&_button]:py-2 [&_button]:text-xs [&_button]:font-black [&_button]:text-white [&_button]:shadow-none [&_button:hover]:translate-y-0 [&_button:hover]:bg-white/25 [&_button:hover]:shadow-none">
              <Button onClick={() => onAdjust(account)}>Sesuaikan</Button>
              <Button onClick={() => onTransfer(account)}>Transfer</Button>
              <Button onClick={() => onOwnerDraw(account)}><HandCoins size={13} /> Owner</Button>
              <Button onClick={() => onBankFee(account)}>Biaya</Button>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)] items-start gap-4 max-[1080px]:grid-cols-1">
        <SectionCard className="rounded-[28px]" title="Mutasi Saldo Terakhir" description="Riwayat perubahan kas, rekening, QRIS, biaya, dan transaksi agen.">
          {mutations.length === 0 ? <EmptyState compact title="Belum ada mutasi saldo" description="Mutasi muncul setelah POS, transaksi agen, atau aksi saldo." /> : (
            <DataTable columns={["Akun", "Tipe", "Nominal", "Saldo"]} template="minmax(0,1fr) 160px 130px 130px" minWidth={760}>
              {mutations.map((mutation) => (
                <DataRow key={mutation.id} template="minmax(0,1fr) 160px 130px 130px">
                  <DataCell><strong>{mutation.account_name}</strong><DataCellText>{mutation.notes || "-"}</DataCellText></DataCell>
                  <DataCell>{mutationLabel(mutation.mutation_type)}<DataCellText>{mutation.created_at}</DataCellText></DataCell>
                  <strong className={mutation.amount < 0 ? "text-red-600" : "text-emerald-600"}>{formatRupiah(mutation.amount)}</strong>
                  <strong>{formatRupiah(mutation.balance_after)}</strong>
                </DataRow>
              ))}
            </DataTable>
          )}
        </SectionCard>
        <SectionCard className="rounded-[28px]" title="Rekening Non-Tunai" description="Bank, QRIS, dan saldo provider.">
          {nonCashAccounts.length === 0 ? <EmptyState compact title="Belum ada rekening" description="Tambahkan rekening bank atau QRIS." /> : nonCashAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block">
              <div><strong>{account.name}</strong><small>{account.code}</small></div>
              <strong>{formatRupiah(account.balance)}</strong>
            </div>
          ))}
        </SectionCard>
      </section>
    </>
  );
}
