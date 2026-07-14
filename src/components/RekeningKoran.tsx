"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import { Card, Button, Input, Select, Spinner, EmptyState, Badge, StatCard } from "@/components/ui";
import { DynamicIcon } from "@/components/DynamicIcon";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  Download,
  Printer,
  FileText,
  Calendar,
  X,
} from "lucide-react";
import { useSettings } from "@/lib/use-settings";

interface Account {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  balance: string;
  minBalance: string | null;
}

interface Mutation {
  id: number;
  accountId: number;
  accountName: string | null;
  accountIcon: string | null;
  accountColor: string | null;
  type: string;
  amount: string | number;
  balanceAfter: string | number;
  notes: string | null;
  referenceId: number | null;
  createdAt: string;
}

interface Summary {
  count: number;
  totalIn: number;
  totalOut: number;
  openingBalance: number;
  closingBalance: number;
  netChange: number;
}

// Label untuk tipe mutasi
const mutationTypeLabels: Record<string, { label: string; variant: "success" | "danger" | "warning" | "primary" | "purple" | "default" }> = {
  opening: { label: "Saldo Awal", variant: "primary" },
  opening_adjust: { label: "Penyesuaian", variant: "warning" },
  adjustment: { label: "Penyesuaian", variant: "warning" },
  transfer_in: { label: "Transfer Masuk", variant: "success" },
  transfer_out: { label: "Transfer Keluar", variant: "danger" },
  pos_in: { label: "Penjualan POS", variant: "success" },
  pos_out: { label: "Pembayaran POS", variant: "danger" },
  brilink_in: { label: "Penerimaan Agen", variant: "success" },
  brilink_out: { label: "Pembayaran Agen", variant: "danger" },
  cash_in: { label: "Kas Masuk", variant: "success" },
  cash_out: { label: "Kas Keluar", variant: "danger" },
};

export default function RekeningKoran() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { settings } = useSettings();
  const servicesLabel = settings.services_label || "Layanan Agen";

  // Default date range: bulan ini
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  }, []);

  // Load accounts
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id.toString());
        }
      })
      .catch(() => {});
  }, []);

  // Load mutations when filter changes
  useEffect(() => {
    if (!selectedAccountId) return;
    setLoading(true);
    const params = new URLSearchParams({
      accountId: selectedAccountId,
      limit: "500",
    });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    fetch(`/api/accounts/mutations?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setMutations(data.mutations || []);
        setSummary(data.summary || null);
      })
      .catch(() => {
        setMutations([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [selectedAccountId, startDate, endDate]);

  // Selected account info
  const selectedAccount = accounts.find((a) => a.id.toString() === selectedAccountId);

  // Quick date presets
  function setPreset(preset: string) {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    switch (preset) {
      case "today":
        start = end = now;
        break;
      case "yesterday":
        start = end = new Date(now.getTime() - 86400000);
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 86400000);
        end = now;
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastmonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }

  // Export CSV
  function exportCSV() {
    if (mutations.length === 0) return;
    const headers = ["Tanggal", "Tipe", "Keterangan", "Masuk", "Keluar", "Saldo"];
    const rows = [...mutations].reverse().map((m) => {
      const amt = Number(m.amount);
      return [
        formatDate(m.createdAt),
        mutationTypeLabels[m.type]?.label || m.type,
        (m.notes || "").replace(/,/g, ";"),
        amt > 0 ? amt.toString() : "",
        amt < 0 ? Math.abs(amt).toString() : "",
        m.balanceAfter,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mutasi-${selectedAccount?.code || "account"}-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Print
  function printRekeningKoran() {
    window.print();
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rekening Koran</h2>
          <p className="text-sm text-slate-400">
            Mutasi rekening instan — mirip rekening koran bank
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!mutations.length}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={printRekeningKoran} disabled={!mutations.length}>
            <Printer size={14} /> Print
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Rekening"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Input
            label="Dari Tanggal"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Sampai Tanggal"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Presets</label>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "today", label: "Hari Ini" },
                { id: "week", label: "7 Hari" },
                { id: "month", label: "Bulan Ini" },
                { id: "lastmonth", label: "Bulan Lalu" },
                { id: "year", label: "Tahun Ini" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {summary && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Scale size={20} />}
            label="Saldo Awal"
            value={formatRupiah(summary.openingBalance)}
            sub={startDate}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={<ArrowDownLeft size={20} />}
            label="Total Masuk"
            value={formatRupiah(summary.totalIn)}
            sub={`${summary.count} transaksi`}
            color="bg-emerald-50 text-emerald-600"
            trend="up"
          />
          <StatCard
            icon={<ArrowUpRight size={20} />}
            label="Total Keluar"
            value={formatRupiah(summary.totalOut)}
            sub={`${summary.count} transaksi`}
            color="bg-red-50 text-red-600"
            trend="down"
          />
          <StatCard
            icon={<Wallet size={20} />}
            label="Saldo Akhir"
            value={formatRupiah(summary.closingBalance)}
            sub={summary.netChange >= 0 ? `+${formatRupiah(summary.netChange)}` : formatRupiah(summary.netChange)}
            color={summary.netChange >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}
            trend={summary.netChange >= 0 ? "up" : "down"}
          />
        </div>
      )}

      {/* Rekening Koran Table */}
      <Card className="overflow-hidden">
        {/* Header bank-style */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-zinc-50 to-white">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{
                  background: `linear-gradient(135deg, ${selectedAccount?.color || "#00875A"} 0%, ${selectedAccount?.color || "#00875A"}dd 100%)`,
                }}
              >
                <DynamicIcon
                  name={selectedAccount?.icon}
                  fallback={selectedAccount?.code === "cash" ? "wallet" : "landmark"}
                  size={22}
                  className="text-white"
                />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{selectedAccount?.name}</h3>
                <p className="text-xs text-slate-400">
                  Periode: {startDate || "—"} s/d {endDate || "—"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Saldo Saat Ini</p>
              <p className="text-xl font-bold text-slate-900">{formatRupiah(selectedAccount?.balance || "0")}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <Spinner />
        ) : mutations.length === 0 ? (
          <EmptyState
            icon="clipboard-list"
            title="Belum ada mutasi"
            subtitle="Tidak ada transaksi pada periode ini"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="text-left p-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Keterangan
                  </th>
                  <th className="text-center p-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="text-right p-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Masuk
                  </th>
                  <th className="text-right p-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Keluar
                  </th>
                  <th className="text-right p-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...mutations].reverse().map((m, idx) => {
                  const amt = Number(m.amount);
                  const isIn = amt > 0;
                  const typeInfo = mutationTypeLabels[m.type] || { label: m.type, variant: "default" as const };
                  return (
                    <tr
                      key={m.id}
                      className={cn(
                        "border-b border-slate-50 hover:bg-emerald-50/30 transition-colors",
                        idx === 0 && "bg-amber-50/30"
                      )}
                    >
                      <td className="p-3 text-slate-600 whitespace-nowrap text-xs">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                              isIn ? "bg-emerald-100" : "bg-red-100"
                            )}
                          >
                            {isIn ? (
                              <ArrowDownLeft size={12} className="text-emerald-600" />
                            ) : (
                              <ArrowUpRight size={12} className="text-red-600" />
                            )}
                          </div>
                          <span className="truncate">{m.notes || typeInfo.label}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-600">
                        {isIn ? formatRupiah(amt) : "—"}
                      </td>
                      <td className="p-3 text-right font-semibold text-red-600">
                        {!isIn ? formatRupiah(Math.abs(amt)) : "—"}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        {formatRupiah(m.balanceAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                  <td colSpan={3} className="p-3 text-right text-slate-700 uppercase text-xs tracking-wider">
                    Total Periode:
                  </td>
                  <td className="p-3 text-right text-emerald-700">
                    {summary ? formatRupiah(summary.totalIn) : "—"}
                  </td>
                  <td className="p-3 text-right text-red-700">
                    {summary ? formatRupiah(summary.totalOut) : "—"}
                  </td>
                  <td className="p-3 text-right text-slate-900">
                    {summary ? formatRupiah(summary.closingBalance) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Print-only header (hidden on screen) */}
      <div className="hidden print:block">
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Rekening Koran — {selectedAccount?.name}
        </h1>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
          Periode: {startDate} s/d {endDate}
        </p>
      </div>
    </div>
  );
}
