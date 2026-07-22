// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterBar from "@/components/rekening-koran/FilterBar";
import SummaryCards from "@/components/rekening-koran/SummaryCards";
import MutationTable from "@/components/rekening-koran/MutationTable";
import type { Account, AccountMutation } from "@/types/models";

const accounts: Account[] = [
  {
    id: 1,
    code: "cash",
    name: "Kas Tunai",
    icon: "wallet",
    color: "#22c55e",
    balance: "100000",
    minBalance: "0",
    isActive: true,
  },
  {
    id: 2,
    code: "bank_bri",
    name: "M-Banking BRI",
    icon: "bri",
    color: "#00529B",
    balance: "500000",
    minBalance: "100000",
    isActive: true,
  },
];

const mutations: AccountMutation[] = [
  {
    id: 1,
    accountId: 1,
    accountName: "Kas Tunai",
    accountIcon: "wallet",
    accountColor: "#22c55e",
    type: "opening",
    amount: "100000",
    balanceAfter: "100000",
    notes: "Saldo awal",
    referenceId: null,
    createdAt: "2026-07-15T01:00:00.000Z",
  },
  {
    id: 2,
    accountId: 1,
    accountName: "Kas Tunai",
    accountIcon: "wallet",
    accountColor: "#22c55e",
    type: "cash_out",
    amount: "-25000",
    balanceAfter: "75000",
    notes: "Kas keluar",
    referenceId: null,
    createdAt: "2026-07-15T02:00:00.000Z",
  },
];

const mutationTypeLabels = {
  opening: { label: "Saldo Awal", variant: "primary" as const },
  cash_out: { label: "Kas Keluar", variant: "danger" as const },
};

describe("Rekening Koran components", () => {
  it("FilterBar triggers preset and export callbacks", async () => {
    const onPreset = vi.fn();
    const onExportCSV = vi.fn();
    render(
      <FilterBar
        accounts={accounts}
        selectedAccountId="1"
        startDate="2026-07-01"
        endDate="2026-07-31"
        canExport
        onAccountChange={() => {}}
        onStartDateChange={() => {}}
        onEndDateChange={() => {}}
        onPreset={onPreset}
        onExportCSV={onExportCSV}
        onExportPDF={() => {}}
        onPrint={() => {}}
      />,
    );

    await userEvent.click(screen.getByText("7 Hari"));
    expect(onPreset).toHaveBeenCalledWith("week");
    await userEvent.click(screen.getByText("CSV"));
    expect(onExportCSV).toHaveBeenCalledTimes(1);
  });

  it("SummaryCards renders balances", () => {
    render(
      <SummaryCards
        loading={false}
        startDate="2026-07-01"
        summary={{
          count: 2,
          totalIn: 100000,
          totalOut: 25000,
          openingBalance: 0,
          closingBalance: 75000,
          netChange: 75000,
        }}
      />,
    );
    expect(screen.getByText("Saldo Awal")).toBeInTheDocument();
    expect(screen.getByText("Total Masuk")).toBeInTheDocument();
    expect(screen.getByText("Saldo Akhir")).toBeInTheDocument();
  });

  it("MutationTable renders mutations", () => {
    render(
      <MutationTable
        loading={false}
        mutations={mutations}
        selectedAccount={accounts[0]}
        startDate="2026-07-01"
        endDate="2026-07-31"
        summary={{
          count: 2,
          totalIn: 100000,
          totalOut: 25000,
          openingBalance: 0,
          closingBalance: 75000,
          netChange: 75000,
        }}
        mutationTypeLabels={mutationTypeLabels}
      />,
    );

    expect(screen.getAllByText("Kas Tunai").length).toBeGreaterThan(0);
    expect(screen.getByText("Saldo awal")).toBeInTheDocument();
    expect(screen.getByText("Kas keluar")).toBeInTheDocument();
  });
});
