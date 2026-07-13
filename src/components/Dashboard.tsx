"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate, formatDateShort, cn } from "@/lib/utils";
import { Card, StatCard, Badge, Spinner, EmptyState } from "@/components/ui";
import {
  TrendingUp,
  ShoppingCart,
  Landmark,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Building2,
} from "lucide-react";

interface Account {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  balance: string;
  minBalance: string | null;
}

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
}

export default function Dashboard() {
  const [d, setD] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(setD).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!d) return <EmptyState icon="❌" title="Gagal memuat dashboard" />;

  const maxRev = d.last7.length ? Math.max(...d.last7.map(x => parseFloat(x.revenue)), 1) : 1;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-400">Ringkasan aktivitas bisnis Anda</p>
        </div>
      </div>

      {/* Account Balances - MULTI ACCOUNT */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {d.accounts.map(acc => {
          const isLow = parseFloat(acc.balance) < parseFloat(acc.minBalance || "0");
          const isCash = acc.code === "cash";
          return (
            <Card 
              key={acc.id} 
              className={cn(
                "p-4 relative overflow-hidden",
                isCash 
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                  : "bg-gradient-to-br from-slate-700 to-slate-800 text-white"
              )}
              style={!isCash ? { background: `linear-gradient(135deg, ${acc.color} 0%, ${acc.color}dd 100%)` } : {}}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{acc.icon}</span>
                  {isLow && <AlertTriangle size={14} className="text-amber-300" />}
                </div>
                <p className="text-xs opacity-80 truncate">{acc.name}</p>
                <p className="text-lg font-bold mt-1">{formatRupiah(acc.balance)}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Balance Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
        <p className="text-blue-800 font-medium mb-1">💡 Tips Multi-Rekening:</p>
        <ul className="text-blue-600 text-xs space-y-0.5 ml-4 list-disc">
          <li><strong>Hemat biaya transfer:</strong> Gunakan rekening yang sama dengan bank tujuan nasabah</li>
          <li><strong>Transfer sesama bank = Gratis:</strong> BRI→BRI, Mandiri→Mandiri, BCA→BCA</li>
          <li><strong>Balancing saldo:</strong> Ke menu "Kas & Saldo" untuk transfer antar rekening</li>
        </ul>
      </div>

      {/* Profit Hero Card */}
      <Card className="p-5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💰</span>
            <span className="text-emerald-100 text-sm font-medium">Keuntungan Hari Ini</span>
          </div>
          <p className="text-4xl font-bold">{formatRupiah(d.today.profit)}</p>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
              <ShoppingCart size={14} />
              <span>POS: {formatRupiah(d.today.pos.profit)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
              <Landmark size={14} />
              <span>BRILink: {formatRupiah(d.today.brilink.profit)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<ShoppingCart size={20} />} label="Total Transaksi" value={d.today.count.toString()} sub="hari ini" color="bg-blue-50 text-blue-500" />
        <StatCard icon={<ArrowUpRight size={20} />} label="Omzet POS" value={formatRupiah(d.today.pos.total)} sub={`${d.today.pos.count} trx`} color="bg-blue-50 text-blue-500" />
        <StatCard icon={<Landmark size={20} />} label="Volume BRILink" value={formatRupiah(d.today.brilink.total)} sub={`${d.today.brilink.count} trx`} color="bg-purple-50 text-purple-500" />
        <StatCard icon={<TrendingUp size={20} />} label="Fee BRILink" value={formatRupiah(d.today.brilink.profit)} sub="100% profit" color="bg-emerald-50 text-emerald-500" />
      </div>

      {/* POS vs BRILink */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100 to-transparent rounded-bl-full opacity-60" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><ShoppingCart size={16} className="text-blue-600" /></div>
              <span className="font-semibold text-gray-700">Penjualan Toko (POS)</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-bold text-gray-800">{d.today.pos.count}</p>
                <p className="text-xs text-gray-400">transaksi</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">{formatRupiah(d.today.pos.total)}</p>
                <p className="text-xs text-emerald-500 font-medium">+{formatRupiah(d.today.pos.profit)} profit</p>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-100 to-transparent rounded-bl-full opacity-60" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Landmark size={16} className="text-purple-600" /></div>
              <span className="font-semibold text-gray-700">Layanan BRILink</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-bold text-gray-800">{d.today.brilink.count}</p>
                <p className="text-xs text-gray-400">transaksi</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-600">{formatRupiah(d.today.brilink.total)}</p>
                <p className="text-xs text-emerald-500 font-medium">+{formatRupiah(d.today.brilink.profit)} fee</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" /> Pendapatan 7 Hari
          </h3>
          {d.last7.length === 0 ? (
            <EmptyState icon="📊" title="Belum ada data" />
          ) : (
            <div className="flex items-end gap-3 h-44 px-2">
              {d.last7.map((day, i) => {
                const pct = (parseFloat(day.revenue) / maxRev) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      {formatRupiah(day.revenue)}
                    </span>
                    <div className="w-full relative">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-blue-400 rounded-lg transition-all duration-700 hover:from-accent hover:to-accent-light cursor-pointer"
                        style={{ height: `${Math.max(pct, 4)}px`, maxHeight: "140px", minHeight: "6px" }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{formatDateShort(day.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Stok Menipis
          </h3>
          {d.lowStock.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">
              <span className="text-2xl block mb-1">✅</span>Semua stok aman
            </div>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {d.lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                  <span className="text-sm text-gray-700 truncate flex-1">{p.name}</span>
                  <Badge variant="danger">{p.stock} {p.unit}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <h3 className="font-semibold text-gray-700">Transaksi Terakhir</h3>
        </div>
        {d.recent.length === 0 ? (
          <EmptyState icon="📋" title="Belum ada transaksi" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
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
                  <tr key={t.id} className="border-b border-gray-50/50 hover:bg-blue-50/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-gray-500">{t.invoiceNo}</td>
                    <td className="p-3"><Badge variant={t.type === "pos" ? "primary" : "purple"}>{t.type === "pos" ? "POS" : "BRILink"}</Badge></td>
                    <td className="p-3 text-gray-600">{t.customerName || "—"}</td>
                    <td className="p-3 text-right font-semibold">{formatRupiah(t.totalAmount)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatRupiah(t.profit || "0")}</td>
                    <td className="p-3 text-gray-400 text-xs">{formatDate(t.createdAt)}</td>
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
