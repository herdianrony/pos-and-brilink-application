"use client";

import { Card, Button, Input, Select } from "@/components/ui";
import { Download, Printer } from "lucide-react";
import type { Account } from "@/types/models";
import type { DatePreset } from "@/types/rekening-koran";

interface Props {
  accounts: Account[];
  selectedAccountId: string;
  startDate: string;
  endDate: string;
  canExport: boolean;
  onAccountChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPreset: (preset: DatePreset) => void;
  onExportCSV: () => void;
  onPrint: () => void;
}

const PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: "today", label: "Hari Ini" },
  { id: "week", label: "7 Hari" },
  { id: "month", label: "Bulan Ini" },
  { id: "lastmonth", label: "Bulan Lalu" },
  { id: "year", label: "Tahun Ini" },
];

export default function FilterBar({
  accounts,
  selectedAccountId,
  startDate,
  endDate,
  canExport,
  onAccountChange,
  onStartDateChange,
  onEndDateChange,
  onPreset,
  onExportCSV,
  onPrint,
}: Props) {
  return (
    <>
      <div className="flex items-center gap-2 no-print">
        <Button variant="secondary" size="sm" onClick={onExportCSV} disabled={!canExport}>
          <Download size={14} /> CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={onPrint} disabled={!canExport}>
          <Printer size={14} /> Print
        </Button>
      </div>

      <Card className="p-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select label="Rekening" value={selectedAccountId} onChange={(event) => onAccountChange(event.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </Select>
          <Input label="Dari Tanggal" type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} />
          <Input label="Sampai Tanggal" type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Presets</label>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onPreset(preset.id)}
                  className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
