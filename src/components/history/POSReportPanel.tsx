"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Spinner, useToast } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";
import {
  buildReportHtml,
  exportReportPdf,
  reportTable,
} from "@/lib/report-export";
import {
  Download,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface POSReport {
  summary: {
    count: number;
    revenue: number;
    profit: number;
    cogs: number;
    average: number;
  };
  byPayment: Array<{
    paymentMethod: string | null;
    count: number;
    revenue: number;
    profit: number;
  }>;
  products: Array<{
    productId: number | null;
    productName: string;
    qty: number;
    grossSales: number;
  }>;
  daily: Array<{
    date: string;
    count: number;
    revenue: number;
    profit: number;
  }>;
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstDayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function POSReportPanel() {
  const [start, setStart] = useState(firstDayLocal());
  const [end, setEnd] = useState(todayLocal());
  const [data, setData] = useState<POSReport | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start, end });
      const res = await fetch(`/api/reports/pos?${params.toString()}`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.summary) {
        setData(null);
        if (res.status !== 403)
          toast.error(body?.error || "Gagal memuat laporan POS");
        return;
      }
      setData(body);
    } finally {
      setLoading(false);
    }
  }, [start, end, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function exportPdf() {
    if (!data) return;
    const html = buildReportHtml({
      title: "Laporan POS",
      subtitle: "Ringkasan penjualan kasir POS",
      meta: [["Periode", `${start} s/d ${end}`]],
      summary: [
        { label: "Transaksi", value: String(data.summary.count) },
        {
          label: "Omzet",
          value: formatRupiah(data.summary.revenue),
          tone: "success",
        },
        {
          label: "HPP",
          value: formatRupiah(data.summary.cogs),
          tone: "warning",
        },
        {
          label: "Profit",
          value: formatRupiah(data.summary.profit),
          tone: "success",
        },
      ],
      sections: [
        {
          title: "Metode Pembayaran",
          html: reportTable(
            ["Metode", "Transaksi", "Omzet", "Profit"],
            data.byPayment.map((row) => [
              row.paymentMethod || "—",
              row.count,
              formatRupiah(row.revenue),
              formatRupiah(row.profit),
            ]),
          ),
        },
        {
          title: "Produk Terlaris",
          html: reportTable(
            ["Produk", "Qty", "Omzet Kotor"],
            data.products.map((row) => [
              row.productName,
              row.qty,
              formatRupiah(row.grossSales),
            ]),
          ),
        },
        {
          title: "Ringkasan Harian",
          html: reportTable(
            ["Tanggal", "Transaksi", "Omzet", "Profit"],
            data.daily.map((row) => [
              row.date,
              row.count,
              formatRupiah(row.revenue),
              formatRupiah(row.profit),
            ]),
          ),
        },
      ],
    });
    const result = await exportReportPdf(
      html,
      `laporan-pos-${start}-${end}.pdf`,
    );
    if (result.ok && !result.browserPrint)
      toast.success("PDF laporan POS disimpan");
    else if (result.error) toast.error(result.error);
  }

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Produk", "Qty", "Omzet Kotor"],
      ...data.products.map((p) => [
        p.productName,
        String(p.qty),
        String(p.grossSales),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-pos-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-5 space-y-4 border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-600" /> Laporan POS
          </h3>
          <p className="text-xs text-slate-500">
            Ringkasan omzet, HPP, profit, metode bayar, dan produk terlaris.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <Button size="sm" variant="secondary" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPdf}>
            <Download size={14} /> PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <Download size={14} /> CSV Produk
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <Spinner />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Metric
                icon={<ShoppingCart size={16} />}
                label="Transaksi"
                value={String(data.summary.count)}
              />
              <Metric
                icon={<TrendingUp size={16} />}
                label="Omzet"
                value={formatRupiah(data.summary.revenue)}
              />
              <Metric
                icon={<Wallet size={16} />}
                label="HPP"
                value={formatRupiah(data.summary.cogs)}
              />
              <Metric
                icon={<TrendingUp size={16} />}
                label="Profit"
                value={formatRupiah(data.summary.profit)}
                accent
              />
              <Metric
                icon={<ShoppingCart size={16} />}
                label="Rata-rata"
                value={formatRupiah(data.summary.average)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
                <div className="p-3 border-b font-bold text-sm">
                  Metode Pembayaran
                </div>
                {data.byPayment.length === 0 ? (
                  <p className="p-3 text-sm text-slate-400">Belum ada data</p>
                ) : (
                  data.byPayment.map((row) => (
                    <div
                      key={row.paymentMethod || "unknown"}
                      className="p-3 border-b last:border-0 flex justify-between text-sm"
                    >
                      <span className="capitalize font-semibold">
                        {row.paymentMethod || "—"}{" "}
                        <span className="text-slate-400">({row.count})</span>
                      </span>
                      <span className="font-bold">
                        {formatRupiah(row.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
                <div className="p-3 border-b font-bold text-sm">
                  Produk Terlaris
                </div>
                {data.products.slice(0, 8).map((row) => (
                  <div
                    key={`${row.productId}-${row.productName}`}
                    className="p-3 border-b last:border-0 flex justify-between gap-3 text-sm"
                  >
                    <span className="font-semibold truncate">
                      {row.productName}{" "}
                      <span className="text-slate-400">× {row.qty}</span>
                    </span>
                    <span className="font-bold whitespace-nowrap">
                      {formatRupiah(row.grossSales)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
        {icon}
        {label}
      </div>
      <p
        className={
          accent
            ? "text-lg font-extrabold text-emerald-600 mt-1"
            : "text-lg font-extrabold text-slate-800 mt-1"
        }
      >
        {value}
      </p>
    </div>
  );
}
