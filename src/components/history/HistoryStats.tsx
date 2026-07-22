"use client";

import { StatCard } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";
import { Landmark, ShoppingCart, TrendingUp } from "lucide-react";

interface Props {
  count: number;
  revenue: number;
  profit: number;
  showProfit?: boolean;
}

export default function HistoryStats({
  count,
  revenue,
  profit,
  showProfit = true,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        icon={<ShoppingCart size={18} />}
        label="Total"
        value={count.toString()}
        sub="transaksi"
        color="bg-emerald-50 text-emerald-500"
      />
      <StatCard
        icon={<TrendingUp size={18} />}
        label="Pendapatan"
        value={formatRupiah(revenue)}
        color="bg-emerald-50 text-emerald-500"
      />
      {showProfit ? (
        <StatCard
          icon={<Landmark size={18} />}
          label="Keuntungan"
          value={formatRupiah(profit)}
          color="bg-amber-50 text-amber-500"
        />
      ) : (
        <StatCard
          icon={<Landmark size={18} />}
          label="Status"
          value="Aktif"
          sub="transaksi"
          color="bg-amber-50 text-amber-500"
        />
      )}
    </div>
  );
}
