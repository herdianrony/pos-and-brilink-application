import { useState, type FormEvent } from "react";
import type { AccountMutationRow, AccountRow, DebtRow, TransactionRow } from "../api";
import { PageHeader } from "../components/ui";
import { tw } from "../lib/tw";
import { CashBalancePage } from "./CashBalancePage";
import { DebtsPage } from "./DebtsPage";
import { HistoryPage } from "./HistoryPage";
import { ReportsPage } from "./ReportsPage";
import { StatementPage } from "./StatementPage";
import type { TransactionItemRow } from "../api";

type FinanceTab = "cash" | "statement" | "debts" | "reports" | "history";

const tabs: Array<{ id: FinanceTab; label: string }> = [
  { id: "cash", label: "Kas & Saldo" },
  { id: "statement", label: "Rekening Koran" },
  { id: "debts", label: "Buku Utang" },
  { id: "reports", label: "Laporan" },
  { id: "history", label: "Transaksi" },
];

export function FinancePage({
  accounts,
  mutations,
  debts,
  debtForm,
  debtPaymentForm,
  saving,
  transactions,
  selectedTransaction,
  selectedTransactionItems,
  onAddAccount,
  onTransfer,
  onAdjust,
  onOwnerDraw,
  onBankFee,
  onDebtFormChange,
  onDebtPaymentFormChange,
  onSubmitDebt,
  onSubmitDebtPayment,
  onCopyReminder,
  onOpenTransactionDetail,
  onExportStatementCsv,
  onExportReportCsv,
}: {
  accounts: AccountRow[];
  mutations: AccountMutationRow[];
  debts: DebtRow[];
  debtForm: { customer_name: string; phone: string; amount: string; notes: string };
  debtPaymentForm: { debt_id: string; amount: string; notes: string };
  saving: boolean;
  transactions: TransactionRow[];
  selectedTransaction: TransactionRow | null;
  selectedTransactionItems: TransactionItemRow[];
  onAddAccount: () => void;
  onTransfer: (account?: AccountRow) => void;
  onAdjust: (account: AccountRow) => void;
  onOwnerDraw: (account: AccountRow) => void;
  onBankFee: (account: AccountRow) => void;
  onDebtFormChange: (form: { customer_name: string; phone: string; amount: string; notes: string }) => void;
  onDebtPaymentFormChange: (form: { debt_id: string; amount: string; notes: string }) => void;
  onSubmitDebt: (event: FormEvent) => void;
  onSubmitDebtPayment: (event: FormEvent) => void;
  onCopyReminder: (debt: DebtRow) => void;
  onOpenTransactionDetail: (transaction: TransactionRow) => void;
  onExportStatementCsv: () => void;
  onExportReportCsv: (summary: { posRevenue: number; posProfit: number; agentProfit: number }) => void;
}) {
  const [activeTab, setActiveTab] = useState<FinanceTab>("cash");

  return (
    <div className={tw("settings-page")}>
      <PageHeader eyebrow="Keuangan" title="Keuangan" description="Kas, rekening koran, utang, laporan, dan transaksi dalam satu tempat." />
      <div className={tw("electron-tabs master-tabs")}>
        {tabs.map((tab) => <button key={tab.id} className={tw(activeTab === tab.id ? "electron-tab active" : "electron-tab")} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
      </div>
      {activeTab === "cash" && <CashBalancePage accounts={accounts} mutations={mutations} onAddAccount={onAddAccount} onTransfer={onTransfer} onAdjust={onAdjust} onOwnerDraw={onOwnerDraw} onBankFee={onBankFee} />}
      {activeTab === "statement" && <StatementPage accounts={accounts} mutations={mutations} onExportCsv={onExportStatementCsv} />}
      {activeTab === "debts" && <DebtsPage debts={debts} debtForm={debtForm} debtPaymentForm={debtPaymentForm} saving={saving} onDebtFormChange={onDebtFormChange} onDebtPaymentFormChange={onDebtPaymentFormChange} onSubmitDebt={onSubmitDebt} onSubmitDebtPayment={onSubmitDebtPayment} onCopyReminder={onCopyReminder} />}
      {activeTab === "reports" && <ReportsPage transactions={transactions} mutations={mutations} onExportCsv={onExportReportCsv} />}
      {activeTab === "history" && <HistoryPage transactions={transactions} selectedTransaction={selectedTransaction} selectedTransactionItems={selectedTransactionItems} onOpenDetail={onOpenTransactionDetail} />}
    </div>
  );
}
