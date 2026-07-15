"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import MutationTable from "@/components/rekening-koran/MutationTable";
import PrintView from "@/components/rekening-koran/PrintView";
import { useSettings } from "@/lib/use-settings";
import FilterBar from "@/components/rekening-koran/FilterBar";
import SummaryCards from "@/components/rekening-koran/SummaryCards";
import { csvEscape, getDatePresetRange, getMonthDateRange } from "@/lib/rekening-koran";
import type { Account, AccountMutation as Mutation } from "@/types/models";
import type { DatePreset, RekeningKoranSummary } from "@/types/rekening-koran";

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
  const [summary, setSummary] = useState<RekeningKoranSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { settings } = useSettings();
  const servicesLabel = settings.services_label || "Layanan Agen";

  // Default date range: bulan ini
  useEffect(() => {
    const range = getMonthDateRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
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
  }, [selectedAccountId]);

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
  function setPreset(preset: DatePreset) {
    const range = getDatePresetRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
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
        m.notes || "",
        amt > 0 ? amt.toString() : "",
        amt < 0 ? Math.abs(amt).toString() : "",
        m.balanceAfter,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
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
          <h2 className="text-2xl font-extrabold text-slate-900">Rekening Koran</h2>
          <p className="text-sm text-slate-400">
            Mutasi rekening instan — mirip rekening koran bank
          </p>
        </div>

      </div>

      <FilterBar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        startDate={startDate}
        endDate={endDate}
        canExport={mutations.length > 0}
        onAccountChange={setSelectedAccountId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onPreset={setPreset}
        onExportCSV={exportCSV}
        onPrint={printRekeningKoran}
      />

      <SummaryCards summary={summary} loading={loading} startDate={startDate} />

      {/* Rekening Koran Table — screen only (hidden in print) */}
      <MutationTable
        loading={loading}
        mutations={mutations}
        selectedAccount={selectedAccount}
        startDate={startDate}
        endDate={endDate}
        summary={summary}
        mutationTypeLabels={mutationTypeLabels}
      />

      <PrintView
        settings={settings}
        selectedAccount={selectedAccount}
        startDate={startDate}
        endDate={endDate}
        summary={summary}
        mutations={mutations}
        mutationTypeLabels={mutationTypeLabels}
      />
    </div>
  );
}
