"use client";

import { StatCard } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Scale, Wallet } from "lucide-react";
import type { RekeningKoranSummary } from "@/types/rekening-koran";

interface Props {
  summary: RekeningKoranSummary | null;
  loading: boolean;
  startDate: string;
}

export default function SummaryCards({ summary, loading, startDate }: Props) {
  if (!summary || loading) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
      <StatCard icon={<Scale size={20} />} label="Saldo Awal" value={formatRupiah(summary.openingBalance)} sub={startDate} color="bg-emerald-50 text-emerald-600" />
      <StatCard icon={<ArrowDownLeft size={20} />} label="Total Masuk" value={formatRupiah(summary.totalIn)} sub={`${summary.count} transaksi`} color="bg-emerald-50 text-emerald-600" trend="up" />
      <StatCard icon={<ArrowUpRight size={20} />} label="Total Keluar" value={formatRupiah(summary.totalOut)} sub={`${summary.count} transaksi`} color="bg-red-50 text-red-600" trend="down" />
      <StatCard
        icon={<Wallet size={20} />}
        label="Saldo Akhir"
        value={formatRupiah(summary.closingBalance)}
        sub={summary.netChange >= 0 ? `+${formatRupiah(summary.netChange)}` : formatRupiah(summary.netChange)}
        color={summary.netChange >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}
        trend={summary.netChange >= 0 ? "up" : "down"}
      />
    </div>
  );
}
