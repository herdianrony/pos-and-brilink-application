"use client";

import { formatDate, formatRupiah } from "@/lib/utils";
import type { Account, AccountMutation as Mutation } from "@/types/models";
import type { RekeningKoranSummary } from "@/types/rekening-koran";

interface Props {
  settings: Record<string, string | undefined>;
  selectedAccount?: Account;
  startDate: string;
  endDate: string;
  summary: RekeningKoranSummary | null;
  mutations: Mutation[];
  mutationTypeLabels: Record<string, { label: string; variant: string }>;
}

export default function PrintView({ settings, selectedAccount, startDate, endDate, summary, mutations, mutationTypeLabels }: Props) {
  return (
    <div className="print-area hidden print:block">
  {/* Print-only header */}
  <div style={{ textAlign: "center", marginBottom: 20 }}>
    <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
      {settings.app_name || "POS & Agen Bisnis"}
    </h1>
    {settings.store_address && (
      <p style={{ fontSize: 10, color: "#666", margin: "2px 0" }}>{settings.store_address}</p>
    )}
    {settings.phone && (
      <p style={{ fontSize: 10, color: "#666", margin: "2px 0" }}>Telp: {settings.phone}</p>
    )}
  </div>
  <h2 style={{ fontSize: 14, fontWeight: 700, textAlign: "center", margin: "10px 0" }}>
    Rekening Koran
  </h2>
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 12 }}>
    <span><strong>Rekening:</strong> {selectedAccount?.name}</span>
    <span><strong>Periode:</strong> {startDate} s/d {endDate}</span>
  </div>
  {summary && (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 12, padding: "8px 0", borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc" }}>
      <span>Saldo Awal: <strong>{formatRupiah(summary.openingBalance)}</strong></span>
      <span>Masuk: <strong>{formatRupiah(summary.totalIn)}</strong></span>
      <span>Keluar: <strong>{formatRupiah(summary.totalOut)}</strong></span>
      <span>Saldo Akhir: <strong>{formatRupiah(summary.closingBalance)}</strong></span>
    </div>
  )}

  {/* Print table — rebuild clean version for print */}
  {mutations.length > 0 && (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
      <thead>
        <tr>
          <th style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "left", background: "#f5f5f5" }}>Tanggal</th>
          <th style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "left", background: "#f5f5f5" }}>Keterangan</th>
          <th style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "center", background: "#f5f5f5" }}>Tipe</th>
          <th style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right", background: "#f5f5f5" }}>Masuk</th>
          <th style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right", background: "#f5f5f5" }}>Keluar</th>
          <th style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right", background: "#f5f5f5" }}>Saldo</th>
        </tr>
      </thead>
      <tbody>
        {mutations.map((m) => {
          const amt = typeof m.amount === "string" ? parseFloat(m.amount) : m.amount;
          const balAfter = typeof m.balanceAfter === "string" ? parseFloat(m.balanceAfter) : m.balanceAfter;
          const isIn = amt > 0;
          const typeLabel = mutationTypeLabels[m.type]?.label || m.type;
          return (
            <tr key={m.id}>
              <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{formatDate(m.createdAt)}</td>
              <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{m.notes || typeLabel}</td>
              <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "center" }}>{typeLabel}</td>
              <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right" }}>{isIn ? formatRupiah(Math.abs(amt)) : "—"}</td>
              <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right" }}>{!isIn ? formatRupiah(Math.abs(amt)) : "—"}</td>
              <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right" }}>{formatRupiah(balAfter)}</td>
            </tr>
          );
        })}
      </tbody>
      {summary && (
        <tfoot>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right", fontWeight: "bold" }}>Total:</td>
            <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right", fontWeight: "bold" }}>{formatRupiah(summary.totalIn)}</td>
            <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right", fontWeight: "bold" }}>{formatRupiah(summary.totalOut)}</td>
            <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right", fontWeight: "bold" }}>{formatRupiah(summary.closingBalance)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  )}

  <p style={{ fontSize: 9, color: "#999", textAlign: "center", marginTop: 16 }}>
    Dicetak: {new Date().toLocaleString("id-ID")}
  </p>
</div>
  );
}
