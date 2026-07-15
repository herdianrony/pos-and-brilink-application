"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate, formatDateShort, cn } from "@/lib/utils";
import { Card, StatCard, Badge, Spinner, EmptyState } from "@/components/ui";
import { AccountCard } from "@/components/AccountCard";
import { useSettings } from "@/lib/use-settings";
import {
  TrendingUp,
  ShoppingCart,
  Landmark,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import type { Account } from "@/types/models";

interface DashboardData {
  today: {
    count: number;
    revenue: string;
    profit: string;
    pos: { count: number; total: string; profit: string };
    brilink: { count: number; total: string; fee: string; profit: string };
  };
  lowStock: Array<{ id: number; name: string; stock: number; minStock: number; unit: string | null }>;
  recent: Array<{
    id: number; invoiceNo: string; type: string; subType: string | null;
    totalAmount: string; profit: string | null; createdAt: string; customerName: string | null;
  }>;
  last7: Array<{ date: string; revenue: string; profit: string; count: number }>;
  accounts: Account[];
  pendingCount?: number;
}

export default function Dashboard() {
  const [d, setD] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const servicesLabel = settings.services_label || "Layanan Agen";

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(setD).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!d || !d.today) return <EmptyState icon="x-circle" title="Gagal memuat dashboard" />;

  const maxRev = d.last7?.length ? Math.max(...d.last7.map(x => parseFloat(x.revenue)), 1) : 1;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-400">Ringkasan aktivitas bisnis Anda</p>
      </div>

      {/* Profit Hero + Stats — combined */}
      <Card className="p-6 gradient-dark text-white relative overflow-hidden border-0" style={{ backgroundColor: "#0F172A" }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/25 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-slate-200 text-sm font-semibold">Keuntungan Hari Ini</span>
          </div>
          <p className="text-4xl font-extrabold tracking-tight">{formatRupiah(d.today.profit)}</p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold">
              <ShoppingCart size={12} />
              <span>POS: {formatRupiah(d.today.pos.profit)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold">
              <Landmark size={12} />
              <span>{servicesLabel}: {formatRupiah(d.today.brilink.profit)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid — 4 compact cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<ShoppingCart size={20} />} label="Total Transaksi" value={(d.today.count ?? 0).toString()} sub="hari ini" color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<ArrowUpRight size={20} />} label="Omzet POS" value={formatRupiah(d.today.pos?.total ?? "0")} sub={`${d.today.pos?.count ?? 0} trx`} color="bg-blue-50 text-blue-600" />
        <StatCard icon={<Landmark size={20} />} label={`Volume ${servicesLabel}`} value={formatRupiah(d.today.brilink?.total ?? "0")} sub={`${d.today.brilink?.count ?? 0} trx`} color="bg-violet-50 text-violet-600" />
        <StatCard icon={<TrendingUp size={20} />} label={`Fee ${servicesLabel}`} value={formatRupiah(d.today.brilink?.profit ?? "0")} sub="100% profit" color="bg-amber-50 text-amber-600" />
      </div>

      {/* Action Required block — production-focused, high visibility */}
      {(() => {
        const actions: Array<{ icon: typeof AlertTriangle; label: string; detail: string; color: "amber" | "red"; action: () => void }> = [];
        if (d.pendingCount && d.pendingCount > 0) {
          actions.push({ icon: AlertTriangle, label: `${d.pendingCount} transaksi pending`, detail: "Selesaikan, void, atau reverse transaksi yang belum final.", color: "amber", action: () => window.location.hash = "history" });
        }
        if (d.lowStock.length > 0) {
          actions.push({ icon: AlertTriangle, label: `${d.lowStock.length} produk stok menipis`, detail: "Cek stok fisik dan update stok produk sebelum habis.", color: "amber", action: () => window.location.hash = "products" });
        }
        const lowBalanceAccounts = d.accounts.filter(a => parseFloat(a.balance) < parseFloat(a.minBalance || "0"));
        if (lowBalanceAccounts.length > 0) {
          actions.push({ icon: AlertTriangle, label: `${lowBalanceAccounts.length} rekening di bawah minimum`, detail: "Top up atau sesuaikan saldo agar transaksi tidak terhambat.", color: "red", action: () => window.location.hash = "cash" });
        }

        if (actions.length === 0) {
          return (
            <Card className="p-4 border-emerald-200 bg-emerald-50/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-800">Semua aman hari ini</h3>
                  <p className="text-xs text-emerald-700">Tidak ada transaksi pending, stok kritis, atau rekening di bawah minimum.</p>
                </div>
              </div>
            </Card>
          );
        }

        return (
          <Card className="p-5 space-y-4 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-amber-800">Perlu Tindakan</h3>
                  <p className="text-xs text-amber-700">Prioritaskan item berikut sebelum lanjut operasional.</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{actions.length} item</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={a.action}
                  className={`text-left rounded-2xl border p-4 transition-all hover:shadow-card ${
                    a.color === "red" ? "border-red-200 bg-red-50/80 hover:bg-red-50" : "border-amber-200 bg-white hover:bg-amber-50/70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <a.icon size={18} className={a.color === "red" ? "text-red-500 mt-0.5" : "text-amber-500 mt-0.5"} />
                    <div>
                      <p className={a.color === "red" ? "font-extrabold text-red-700" : "font-extrabold text-amber-700"}>{a.label}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.detail}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Account Balances — compact horizontal scroll */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Saldo Rekening</h3>
          <span className="text-xs text-slate-400">{d.accounts.length} akun</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {d.accounts.map(acc => (
            <div key={acc.id} className="shrink-0 w-[200px]">
              <AccountCard account={acc} compact />
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-700 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" /> Pendapatan 7 Hari
            </h3>
          </div>
          {d.last7.length === 0 ? (
            <EmptyState icon="bar-chart-3" title="Belum ada data" />
          ) : (
            <div className="flex items-end gap-3 h-44 px-2">
              {d.last7.map((day, i) => {
                const pct = (parseFloat(day.revenue) / maxRev) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      {formatRupiah(day.revenue)}
                    </span>
                    <div className="w-full relative">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-primary-light rounded-xl transition-all duration-700 hover:from-accent hover:to-accent-light cursor-pointer"
                        style={{ height: `${Math.max(pct, 4)}px`, maxHeight: "140px", minHeight: "6px" }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{formatDateShort(day.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Stok Menipis
          </h3>
          {d.lowStock.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 size={28} className="text-emerald-500" />
              <span>Semua stok aman</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {d.lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                  <span className="text-sm text-slate-700 truncate flex-1">{p.name}</span>
                  <Badge variant="danger">{p.stock} {p.unit}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-700">Transaksi Terakhir</h3>
        </div>
        {d.recent.length === 0 ? (
          <EmptyState icon="clipboard-list" title="Belum ada transaksi" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left p-3 font-medium">Invoice</th>
                  <th className="text-left p-3 font-medium">Tipe</th>
                  <th className="text-left p-3 font-medium">Pelanggan</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-right p-3 font-medium">Profit</th>
                  <th className="text-left p-3 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map(t => (
                  <tr key={t.id} className="border-b border-slate-50/50 hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-slate-500">{t.invoiceNo}</td>
                    <td className="p-3"><Badge variant={t.type === "pos" ? "primary" : "purple"}>{t.type === "pos" ? "POS" : servicesLabel}</Badge></td>
                    <td className="p-3 text-slate-600">{t.customerName || "—"}</td>
                    <td className="p-3 text-right font-semibold">{formatRupiah(t.totalAmount)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">{formatRupiah(t.profit || "0")}</td>
                    <td className="p-3 text-slate-400 text-xs">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
