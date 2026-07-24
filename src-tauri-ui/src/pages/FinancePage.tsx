import { useState } from "react";
import type { AccountMutationRow, AccountRow } from "../api";
import { PageHeader, Tabs } from "../components/ui";
import { CashBalancePage } from "./CashBalancePage";
import { StatementPage } from "./StatementPage";
import { ReportsPage } from "./ReportsPage";
import type { TransactionRow } from "../api";

const FINANCE_TABS = [
  { id: "cash", label: "Cash & Balance" },
  { id: "statement", label: "Account Statement" },
  { id: "reports", label: "Reports" },
] as const;

type FinanceTabId = (typeof FINANCE_TABS)[number]["id"];

export function FinancePage({
  accounts,
  mutations,
  transactions,
  saving,
  onAddAccount,
  onTransfer,
  onAdjust,
  onOwnerDraw,
  onBankFee,
  onExportCsv,
}: {
  accounts: AccountRow[];
  mutations: AccountMutationRow[];
  transactions: TransactionRow[];
  saving: boolean;
  onAddAccount: () => void;
  onTransfer: (account?: AccountRow) => void;
  onAdjust: (account: AccountRow) => void;
  onOwnerDraw: (account: AccountRow) => void;
  onBankFee: (account: AccountRow) => void;
  onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void;
}) {
  const [activeTab, setActiveTab] = useState<FinanceTabId>("cash");

  return (
    <div className="space-y-5 animate-fadeIn">
      <PageHeader
        eyebrow="Finance"
        title="Finance"
        description="Manage cash balances, account statements, and financial reports."
      />

      <Tabs
        items={[...FINANCE_TABS]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as FinanceTabId)}
        ariaLabel="Finance tabs"
      />

      {activeTab === "cash" && (
        <CashBalancePage
          accounts={accounts}
          mutations={mutations}
          onAddAccount={onAddAccount}
          onTransfer={onTransfer}
          onAdjust={onAdjust}
          onOwnerDraw={onOwnerDraw}
          onBankFee={onBankFee}
          embedded
        />
      )}

      {activeTab === "statement" && (
        <StatementPage
          accounts={accounts}
          mutations={mutations}
          onExportCsv={onExportCsv}
          embedded
        />
      )}

      {activeTab === "reports" && (
        <ReportsPage
          transactions={transactions}
          mutations={mutations}
          onExportCsv={onExportCsv}
        />
      )}
    </div>
  );
}
