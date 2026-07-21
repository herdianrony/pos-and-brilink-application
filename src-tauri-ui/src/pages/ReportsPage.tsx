import { BarChart3, Download, Landmark, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import type { AccountMutationRow, TransactionRow } from "../api";
import { formatRupiah, paymentLabel } from "../lib/format";

function maxValue(values: number[]) {
  return Math.max(...values, 1);
}

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
  const agentRevenue = agentTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0);
  const agentProfit = agentTransactions.reduce((sum, transaction) => sum + transaction.profit, 0);
  const totalProfit = posProfit + agentProfit;
  const chartRows = [
    { label: "Omzet POS", value: posRevenue, tone: "from-emerald-600 to-emerald-400" },
    { label: "Omzet Layanan", value: agentRevenue, tone: "from-blue-600 to-cyan-400" },
    { label: "Profit POS", value: posProfit, tone: "from-violet-600 to-fuchsia-400" },
    { label: "Keuntungan Agen", value: agentProfit, tone: "from-amber-500 to-orange-400" },
  ];
  const maximum = maxValue(chartRows.map((row) => row.value));
  const paymentRows = ["cash", "transfer", "qris", "mixed"].map((method) => {
    const value = transactions.filter((transaction) => transaction.payment_method === method).reduce((sum, transaction) => sum + transaction.total_amount, 0);
    return { method, value };
  }).filter((row) => row.value > 0);
  const maxPayment = maxValue(paymentRows.map((row) => row.value));

  return (
    <div className="reports-page">
      <div className="page-title reports-title">
        <div>
          <p className="eyebrow">Analitik Bisnis</p>
          <h1>Laporan</h1>
          <p>Ringkasan omzet, keuntungan, dan aktivitas kasir.</p>
        </div>
        <button className="secondary" onClick={() => onExportCsv({ posRevenue, posProfit, agentProfit })}><Download size={16} /> Unduh CSV</button>
      </div>

      <section className="electron-stat-grid reports-stat-grid">
        <div className="electron-stat-card"><span className="stat-icon green"><ReceiptText size={20} /></span><div><small>Omzet POS</small><strong>{formatRupiah(posRevenue)}</strong><p>{posTransactions.length} transaksi POS</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon blue"><Landmark size={20} /></span><div><small>Volume Layanan</small><strong>{formatRupiah(agentRevenue)}</strong><p>{agentTransactions.length} transaksi agen</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon amber"><TrendingUp size={20} /></span><div><small>Total Keuntungan</small><strong>{formatRupiah(totalProfit)}</strong><p>POS + layanan</p></div></div>
        <div className="electron-stat-card"><span className="stat-icon purple"><WalletCards size={20} /></span><div><small>Mutasi Saldo</small><strong>{mutations.length}</strong><p>catatan mutasi</p></div></div>
      </section>

      <section className="reports-layout">
        <div className="card reports-chart-card">
          <div className="card-header"><div><h2>Performa Penjualan</h2><p>Perbandingan omzet dan keuntungan berdasarkan data transaksi.</p></div><BarChart3 className="text-emerald-600" size={22} /></div>
          <div className="reports-bar-list">
            {chartRows.map((row) => (
              <div key={row.label} className="reports-bar-row">
                <div className="flex items-center justify-between gap-3"><span>{row.label}</span><strong>{formatRupiah(row.value)}</strong></div>
                <div className="reports-bar-track"><div className={`reports-bar-fill bg-gradient-to-r ${row.tone}`} style={{ width: `${Math.max(4, Math.round((row.value / maximum) * 100))}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card reports-side-card">
          <div className="card-header"><div><h2>Metode Pembayaran</h2><p>Komposisi pembayaran yang tercatat.</p></div></div>
          {paymentRows.length === 0 ? <div className="empty-state compact"><strong>Belum ada pembayaran</strong><span>Data muncul setelah transaksi.</span></div> : paymentRows.map((row) => (
            <div key={row.method} className="reports-payment-row">
              <div><strong>{paymentLabel(row.method)}</strong><small>{formatRupiah(row.value)}</small></div>
              <div className="reports-payment-track"><span style={{ width: `${Math.max(8, Math.round((row.value / maxPayment) * 100))}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="card reports-note-card">
        <h2>Catatan Laporan</h2>
        <p>Laporan ini memakai data lokal yang sudah tersimpan. Unduh CSV tersedia untuk arsip manual, sedangkan PDF native Tauri akan ditambahkan pada tahap berikutnya.</p>
      </section>
    </div>
  );
}
