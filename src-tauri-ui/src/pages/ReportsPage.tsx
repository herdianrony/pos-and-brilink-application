import type { AccountMutationRow, TransactionRow } from "../api";
import { formatRupiah } from "../lib/format";

export function ReportsPage({
  transactions,
  mutations,
  onExportCsv,
}: {
  transactions: TransactionRow[];
  mutations: AccountMutationRow[];
  onExportCsv: (summary: { posRevenue: number; posProfit: number; agentProfit: number }) => void;
}) {
  const posTransactions = transactions.filter((transaction) => transaction.transaction_type === "pos");
  const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
  const posRevenue = posTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const posProfit = posTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
  const agentProfit = agentTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Analitik</p><h1>Laporan</h1></div><button className="secondary" onClick={() => onExportCsv({ posRevenue, posProfit, agentProfit })}>Export CSV</button></div>
      <section className="stat-grid">
        <div className="stat-card green"><span>Omzet POS</span><strong>{formatRupiah(posRevenue)}</strong><small>{posTransactions.length} transaksi POS</small></div>
        <div className="stat-card blue"><span>Profit POS</span><strong>{formatRupiah(posProfit)}</strong><small>Dari margin produk</small></div>
        <div className="stat-card amber"><span>Fee Agen</span><strong>{formatRupiah(agentProfit)}</strong><small>{agentTransactions.length} transaksi agen</small></div>
        <div className="stat-card purple"><span>Total Mutasi</span><strong>{mutations.length}</strong><small>Mutasi saldo tersimpan</small></div>
      </section>
      <section className="card">
        <h2>Catatan Export</h2>
        <p>Export CSV/PDF native Tauri akan dibuat pada tahap berikutnya. Data laporan inti sudah tersedia di database lokal.</p>
      </section>
    </>
  );
}
