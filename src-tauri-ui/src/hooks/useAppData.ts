import { useCallback, useState } from "react";
import {
  AccountMutationRow,
  AccountRow,
  AppLogRow,
  BackupRow,
  CategoryRow,
  DebtRow,
  ProductRow,
  PublicUser,
  TransactionRow,
  dbInit,
  healthCheck,
  listAccountMutations,
  listAccounts,
  listAppLogs,
  listCategories,
  listDatabaseBackups,
  listDebts,
  listProducts,
  listTransactions,
  listUsers,
  setupStatus,
} from "../api";

export function useAppData(onMessage: (message: string) => void) {
  const [loading, setLoading] = useState(true);
  const [dbPath, setDbPath] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(true);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountMutations, setAccountMutations] = useState<AccountMutationRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [appLogs, setAppLogs] = useState<AppLogRow[]>([]);

  const refreshData = useCallback(async () => {
    const [nextAccounts, nextMutations, nextCategories, nextProducts, nextTransactions, nextDebts, nextUsers, nextBackups, nextLogs] = await Promise.all([
      listAccounts(),
      listAccountMutations(),
      listCategories(),
      listProducts(),
      listTransactions(),
      listDebts(),
      listUsers(),
      listDatabaseBackups(),
      listAppLogs(),
    ]);
    setAccounts(nextAccounts);
    setAccountMutations(nextMutations);
    setCategories(nextCategories);
    setProducts(nextProducts);
    setTransactions(nextTransactions);
    setDebts(nextDebts);
    setUsers(nextUsers);
    setBackups(nextBackups);
    setAppLogs(nextLogs);
    return { accounts: nextAccounts };
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const health = await healthCheck();
      const db = await dbInit();
      const setup = await setupStatus();
      setDbPath(db.path);
      setSetupNeeded(setup.setup_needed);
      onMessage(`${health.app} siap (${health.backend})`);
      if (!setup.setup_needed) await refreshData();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [onMessage, refreshData]);

  return {
    loading,
    dbPath,
    setupNeeded,
    setSetupNeeded,
    accounts,
    accountMutations,
    categories,
    products,
    transactions,
    debts,
    users,
    backups,
    appLogs,
    refreshData,
    bootstrap,
  };
}
