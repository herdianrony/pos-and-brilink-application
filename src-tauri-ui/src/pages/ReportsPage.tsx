import { BarChart3, Download, Landmark, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import type { AccountMutationRow, TransactionRow } from "../api";
import { PaymentMethodChart, ReportPerformanceChart } from "../components/charts/BusinessCharts";
import { Button, EmptyState, PageHeader, SectionCard, StatCard } from "../components/ui";
import { formatRupiah, paymentLabel } from "../lib/format";


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
    { label: "Omzet POS", value: posRevenue, color: "#047857" },
    { label: "Omzet Layanan", value: agentRevenue, color: "#0f766e" },
    { label: "Profit POS", value: posProfit, color: "#0284c7" },
    { label: "Keuntungan Agen", value: agentProfit, color: "#d97706" },
  ];
  const paymentRows = ["cash", "transfer", "qris", "mixed"].map((method) => {
    const value = transactions.filter((transaction) => transaction.payment_method === method).reduce((sum, transaction) => sum + transaction.total_amount, 0);
    const colors: Record<string, string> = { cash: "#047857", transfer: "#0f766e", qris: "#0284c7", mixed: "#d97706" };
    return { label: paymentLabel(method), value, color: colors[method] ?? "#64748b" };
  }).filter((row) => row.value > 0);

  return (
    <div className="reports-page">
      <PageHeader
        eyebrow="Analitik Bisnis"
        title="Laporan"
        description="Ringkasan omzet, keuntungan, dan aktivitas kasir."
        actions={<Button variant="secondary" onClick={() => onExportCsv({ posRevenue, posProfit, agentProfit })}><Download size={16} /> Unduh CSV</Button>}
      />

      <section className="electron-stat-grid reports-stat-grid">
        <StatCard tone="green" icon={<ReceiptText size={20} />} label="Omzet POS" value={formatRupiah(posRevenue)} sub={`${posTransactions.length} transaksi POS`} />
        <StatCard tone="blue" icon={<Landmark size={20} />} label="Volume Layanan" value={formatRupiah(agentRevenue)} sub={`${agentTransactions.length} transaksi agen`} />
        <StatCard tone="amber" icon={<TrendingUp size={20} />} label="Total Keuntungan" value={formatRupiah(totalProfit)} sub="POS + layanan" />
        <StatCard tone="purple" icon={<WalletCards size={20} />} label="Mutasi Saldo" value={mutations.length} sub="catatan mutasi" />
      </section>

      <section className="reports-layout">
        <SectionCard
          className="reports-chart-card"
          title="Performa Penjualan"
          description="Perbandingan omzet dan keuntungan berdasarkan data transaksi."
          actions={<BarChart3 className="text-emerald-600" size={22} />}
        >
          <ReportPerformanceChart data={chartRows} />
        </SectionCard>

        <SectionCard className="reports-side-card" title="Metode Pembayaran" description="Komposisi pembayaran yang tercatat.">
          {paymentRows.length === 0 ? <EmptyState compact title="Belum ada pembayaran" description="Data muncul setelah transaksi." /> : <PaymentMethodChart data={paymentRows} />}
        </SectionCard>
      </section>

      <SectionCard className="reports-note-card" title="Catatan Laporan">
        <p>Laporan ini memakai data lokal yang sudah tersimpan. Unduh CSV tersedia untuk arsip manual, sedangkan PDF native Tauri akan ditambahkan pada tahap berikutnya.</p>
      </SectionCard>
    </div>
  );
}
