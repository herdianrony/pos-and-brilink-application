// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatusFilter from "@/components/history/StatusFilter";
import HistoryStats from "@/components/history/HistoryStats";
import TransactionTable from "@/components/history/TransactionTable";
import type { Trx } from "@/types/transactions";

const transactions: Trx[] = [
  {
    id: 1,
    invoiceNo: "BRL-001",
    type: "brilink",
    subType: "Transfer",
    customerName: null,
    customerPhone: null,
    totalAmount: "100000",
    adminFee: "2500",
    profit: "2500",
    paymentMethod: "cash",
    notes: null,
    createdAt: "2026-07-15T01:00:00.000Z",
    status: "pending",
    referenceNo: "REF-1",
  },
  {
    id: 2,
    invoiceNo: "POS-001",
    type: "pos",
    subType: null,
    customerName: null,
    customerPhone: null,
    totalAmount: "50000",
    adminFee: null,
    profit: "10000",
    paymentMethod: "cash",
    notes: null,
    createdAt: "2026-07-15T02:00:00.000Z",
    status: "completed",
  },
];

describe("History components", () => {
  it("StatusFilter calls onChange", async () => {
    const onChange = vi.fn();
    render(<StatusFilter active="all" onChange={onChange} />);
    await userEvent.click(screen.getByText("Pending"));
    expect(onChange).toHaveBeenCalledWith("pending");
  });

  it("HistoryStats renders summary values", () => {
    render(<HistoryStats count={2} revenue={150000} profit={12500} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    expect(screen.getByText(/12\.500/)).toBeInTheDocument();
  });

  it("TransactionTable renders transactions and lifecycle buttons", () => {
    const onViewDetail = vi.fn();
    const onOpenAction = vi.fn();
    render(
      <TransactionTable
        loading={false}
        transactions={transactions}
        servicesLabel="Layanan Agen"
        onViewDetail={onViewDetail}
        onOpenAction={onOpenAction}
      />
    );

    expect(screen.getByText("BRL-001")).toBeInTheDocument();
    expect(screen.getByText("POS-001")).toBeInTheDocument();
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
    expect(screen.getByText("Ref: REF-1")).toBeInTheDocument();
  });

  it("TransactionTable shows empty state", () => {
    render(
      <TransactionTable
        loading={false}
        transactions={[]}
        servicesLabel="Layanan Agen"
        onViewDetail={() => {}}
        onOpenAction={() => {}}
      />
    );
    expect(screen.getByText("Belum ada transaksi")).toBeInTheDocument();
  });
});
