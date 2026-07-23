import { useCallback, useRef, useState } from "react";
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

  // Debounce & concurrency guard
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlight = useRef(false);

  const refreshData = useCallback(async () => {
    // If already in-flight, skip
    if (refreshInFlight.current) return;

    // Debounce: wait 300ms before actually fetching
    return new Promise<void>((resolve) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(async () => {
        refreshInFlight.current = true;
        try {
          const [nextAccounts, nextMutations, nextCategories, nextProducts, nextTransactions, nextDebts, nextUsers, nextBackups, nextLogs] = await Promise.all([
            listAccounts(),
            listAccountMutations({ limit: 80 }),
            listCategories(),
            listProducts(),
            listTransactions({ limit: 50 }),
            listDebts({ limit: 100 }),
            listUsers(),
            listDatabaseBackups(),
            listAppLogs({ limit: 80 }),
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
        } catch (error) {
          onMessage(error instanceof Error ? error.message : String(error));
        } finally {
          refreshInFlight.current = false;
          resolve();
        }
      }, 300);
    });
  }, [onMessage]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const health = await healthCheck();
      const db = await dbInit();
      const setup = await setupStatus();
      setDbPath(db.path);
      setSetupNeeded(setup.setup_needed);
      onMessage(`${health.app} siap (${health.backend})`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

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
