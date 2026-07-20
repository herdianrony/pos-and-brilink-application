import type {
  AccountMutationRow,
  AccountRow,
  AppLogRow,
  BackupRow,
  CategoryRow,
  DebtRow,
  PosCheckoutResponse,
  ProductRow,
  PublicUser,
  TransactionItemRow,
  TransactionRow,
} from "./api";

let userId = 2;
let accountId = 2;
let categoryId = 1;
let productId = 1;
let transactionId = 1;
let transactionItemId = 1;
let mutationId = 1;
let debtId = 1;
let logId = 1;

const now = () => new Date().toISOString();

const users: PublicUser[] = [
  { id: 1, name: "Admin", username: "admin", role: "admin" },
];
const passwords = new Map<string, string>([["admin", "Admin123"]]);
const accounts: AccountRow[] = [
  { id: 1, code: "cash", name: "Kas Tunai", icon: "banknote", color: "#22c55e", balance: 0, min_balance: 0, is_active: true },
];
const categories: CategoryRow[] = [];
const products: ProductRow[] = [];
const transactions: TransactionRow[] = [];
const transactionItems: TransactionItemRow[] = [];
const mutations: AccountMutationRow[] = [];
const debts: DebtRow[] = [];
const backups: BackupRow[] = [];
const logs: AppLogRow[] = [];

function log(source: string, message: string, level = "INFO") {
  logs.unshift({ id: logId++, level, source, message, created_at: now() });
}

function addMutation(account: AccountRow, mutation_type: string, amount: number, notes?: string, reference_id?: number) {
  account.balance += amount;
  mutations.unshift({
    id: mutationId++,
    account_id: account.id,
    account_name: account.name,
    mutation_type,
    amount,
    balance_after: account.balance,
    notes,
    reference_id,
    created_at: now(),
  });
}

function publicUser(username: string) {
  return users.find((user) => user.username === username);
}

export async function mockInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const payload = (args?.payload || {}) as any;
  switch (command) {
    case "health_check":
      return { ok: true, app: "CatatAgen Local", backend: "mock-tauri", timestamp: now() } as T;
    case "db_init":
      return { ok: true, path: "mock://catatagen-local.db" } as T;
    case "setup_status":
      return { setup_needed: users.length === 0, user_count: users.length } as T;
    case "create_admin": {
      if (users.length > 0) throw new Error("Setup sudah selesai");
      const admin = { id: userId++, name: payload.name, username: payload.username, role: "admin" };
      users.push(admin);
      passwords.set(payload.username, payload.password);
      return admin as T;
    }
    case "login": {
      const found = publicUser(payload.username);
      if (!found || passwords.get(payload.username) !== payload.password) throw new Error("Username atau password salah");
      return { ok: true, user: found } as T;
    }
    case "list_users":
      return [...users] as T;
    case "create_user": {
      const row = { id: userId++, name: payload.name, username: payload.username, role: payload.role };
      users.push(row);
      passwords.set(payload.username, payload.password);
      log("users", `User dibuat: ${payload.username}`);
      return row as T;
    }
    case "list_accounts":
      return [...accounts] as T;
    case "create_account": {
      const row: AccountRow = {
        id: accountId++,
        code: payload.code,
        name: payload.name,
        icon: payload.icon || "bank",
        color: payload.color || "#2563eb",
        balance: Number(payload.initial_balance || 0),
        min_balance: Number(payload.min_balance || 0),
        is_active: true,
      };
      accounts.push(row);
      if (row.balance > 0) addMutation(row, "initial_balance", row.balance, "Saldo awal");
      return row as T;
    }
    case "adjust_account_balance": {
      const account = accounts.find((item) => item.id === payload.account_id);
      if (!account) throw new Error("Rekening tidak ditemukan");
      addMutation(account, "adjustment", Number(payload.amount), payload.notes);
      return account as T;
    }
    case "transfer_accounts": {
      const from = accounts.find((item) => item.id === payload.from_account_id);
      const to = accounts.find((item) => item.id === payload.to_account_id);
      const amount = Number(payload.amount || 0);
      if (!from || !to) throw new Error("Rekening tidak ditemukan");
      if (from.balance < amount) throw new Error("Saldo rekening asal tidak cukup");
      addMutation(from, "transfer_out", -amount, payload.notes || `Transfer ke ${to.name}`);
      addMutation(to, "transfer_in", amount, `Transfer dari ${from.name}`);
      return true as T;
    }
    case "owner_draw":
    case "bank_fee": {
      const account = accounts.find((item) => item.id === payload.account_id);
      const amount = Number(payload.amount || 0);
      if (!account) throw new Error("Rekening tidak ditemukan");
      if (account.balance < amount) throw new Error("Saldo tidak cukup");
      addMutation(account, command, -amount, payload.notes);
      return account as T;
    }
    case "list_account_mutations":
      return [...mutations] as T;
    case "list_categories":
      return [...categories] as T;
    case "create_category": {
      const row = { id: categoryId++, name: payload.name, icon: payload.icon || "package", color: payload.color || "#059669", is_active: true };
      categories.push(row);
      return row as T;
    }
    case "list_products":
      return products.filter((product) => product.is_active) as T;
    case "create_product": {
      const category = categories.find((item) => item.id === payload.category_id);
      const row: ProductRow = {
        id: productId++,
        name: payload.name,
        barcode: payload.barcode || null,
        category_id: payload.category_id || null,
        category_name: category?.name || null,
        buy_price: Number(payload.buy_price || 0),
        sell_price: Number(payload.sell_price || 0),
        stock: Number(payload.stock || 0),
        min_stock: Number(payload.min_stock || 0),
        unit: payload.unit || "pcs",
        is_active: true,
      };
      products.push(row);
      return row as T;
    }
    case "update_product": {
      const index = products.findIndex((product) => product.id === payload.id);
      if (index < 0) throw new Error("Produk tidak ditemukan");
      const category = categories.find((item) => item.id === payload.category_id);
      products[index] = { ...products[index], ...payload, category_name: category?.name || null };
      return products[index] as T;
    }
    case "deactivate_product": {
      const product = products.find((item) => item.id === payload.id);
      if (product) product.is_active = false;
      return Boolean(product) as T;
    }
    case "checkout_pos_cash": {
      const method = payload.payment_method || "cash";
      const settlement = method === "cash" ? accounts[0] : accounts.find((item) => item.id === payload.settlement_account_id);
      if (!settlement) throw new Error("Rekening penerima tidak ditemukan");
      let total = 0;
      let profit = 0;
      const trxId = transactionId++;
      for (const item of payload.items || []) {
        const product = products.find((row) => row.id === item.product_id);
        if (!product) throw new Error("Produk tidak ditemukan");
        product.stock -= item.quantity;
        const subtotal = product.sell_price * item.quantity;
        total += subtotal;
        profit += (product.sell_price - product.buy_price) * item.quantity;
        transactionItems.push({ id: transactionItemId++, transaction_id: trxId, product_id: product.id, product_name: product.name, quantity: item.quantity, unit_price: product.sell_price, subtotal });
      }
      const invoice = `POS-MOCK-${trxId}`;
      transactions.unshift({ id: trxId, invoice_no: invoice, transaction_type: "pos", customer_name: null, total_amount: total, profit, payment_method: method, status: "completed", notes: null, created_at: now() });
      addMutation(settlement, method === "transfer" ? "pos_transfer_in" : method === "qris" ? "pos_qris_in" : "pos_in", total, invoice, trxId);
      log("pos", `Checkout POS berhasil: ${invoice}`);
      return { ok: true, transaction_id: trxId, invoice_no: invoice, total_amount: total, profit, settlement_account_id: settlement.id, settlement_balance: settlement.balance } as T;
    }
    case "list_transactions":
      return [...transactions] as T;
    case "list_transaction_items":
      return transactionItems.filter((item) => item.transaction_id === payload.transaction_id) as T;
    case "create_agent_transaction": {
      const trxId = transactionId++;
      const fee = Number(payload.fee || 0);
      const providerCost = Number(payload.provider_cost || 0);
      const total = Number(payload.amount || 0) + fee;
      const invoice = `AGN-MOCK-${trxId}`;
      transactions.unshift({ id: trxId, invoice_no: invoice, transaction_type: "agent", customer_name: payload.customer_name || null, total_amount: total, profit: fee - providerCost, payment_method: "mixed", status: "completed", notes: payload.service_name, created_at: now() });
      if (payload.cash_effect) addMutation(accounts[0], "agent_cash_effect", Number(payload.cash_effect), payload.service_name, trxId);
      const account = accounts.find((item) => item.id === payload.account_id);
      if (account && payload.bank_effect) addMutation(account, "agent_bank_effect", Number(payload.bank_effect), payload.service_name, trxId);
      return transactions[0] as T;
    }
    case "list_debts":
      return [...debts] as T;
    case "create_debt": {
      const row = { id: debtId++, customer_name: payload.customer_name, phone: payload.phone || null, amount: Number(payload.amount || 0), paid_amount: 0, outstanding: Number(payload.amount || 0), status: "open", notes: payload.notes || null, created_at: now(), updated_at: now() };
      debts.unshift(row);
      return row as T;
    }
    case "add_debt_payment": {
      const debt = debts.find((item) => item.id === payload.debt_id);
      if (!debt) throw new Error("Data utang tidak ditemukan");
      debt.paid_amount = Math.min(debt.amount, debt.paid_amount + Number(payload.amount || 0));
      debt.outstanding = Math.max(0, debt.amount - debt.paid_amount);
      debt.status = debt.outstanding <= 0 ? "paid" : "open";
      debt.updated_at = now();
      return debt as T;
    }
    case "build_debt_reminder": {
      const debt = debts.find((item) => item.id === payload.debt_id);
      return `Halo ${debt?.customer_name || "Pelanggan"}, sisa utang Anda ${debt?.outstanding || 0}. Terima kasih.` as T;
    }
    case "create_database_backup": {
      const row = { name: `catatagen-backup-${backups.length + 1}.db`, path: `mock://backup-${backups.length + 1}.db`, size: 1024, created_at: now() };
      backups.unshift(row);
      log("backup", `Backup dibuat: ${row.name}`);
      return row as T;
    }
    case "list_database_backups":
      return [...backups] as T;
    case "restore_database_backup":
      log("backup", `Database direstore dari ${payload.path}`, "WARN");
      return true as T;
    case "list_app_logs":
      return [...logs] as T;
    default:
      throw new Error(`Mock command belum tersedia: ${command}`);
  }
}
