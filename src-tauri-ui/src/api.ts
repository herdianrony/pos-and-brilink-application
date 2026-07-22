import { invoke } from "@tauri-apps/api/core";
import { mockInvoke } from "./mockApi";

function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  if (env?.VITE_TAURI_UI_E2E === "1") {
    return mockInvoke<T>(command, args);
  }
  return invoke<T>(command, args);
}

export interface HealthCheck {
  ok: boolean;
  app: string;
  backend: string;
  timestamp: string;
}

export interface SetupStatus {
  setup_needed: boolean;
  user_count: number;
}

export interface PublicUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

export interface AccountRow {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  balance: number;
  min_balance: number;
  is_active: boolean;
}

export interface AccountMutationRow {
  id: number;
  account_id: number;
  account_name: string;
  mutation_type: string;
  amount: number;
  balance_after: number;
  notes?: string | null;
  reference_id?: number | null;
  created_at: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
}

export interface ProductRow {
  id: number;
  name: string;
  barcode?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  image_path?: string | null;
  is_active: boolean;
}

export interface PosCheckoutResponse {
  ok: boolean;
  transaction_id: number;
  invoice_no: string;
  total_amount: number;
  profit: number;
  discount_amount: number;
  settlement_account_id?: number | null;
  settlement_balance?: number | null;
}

export interface TransactionRow {
  id: number;
  invoice_no: string;
  transaction_type: string;
  customer_name?: string | null;
  total_amount: number;
  profit: number;
  payment_method: string;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface TransactionItemRow {
  id: number;
  transaction_id: number;
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}


export interface AgentServiceRow {
  id: number;
  name: string;
  category?: string | null;
  default_fee: number;
  provider_cost: number;
  is_active: boolean;
}

export interface FeeTierRow {
  id: number;
  service_id: number;
  min_amount: number;
  max_amount?: number | null;
  fee: number;
  provider_cost: number;
}

export interface DebtRow {
  id: number;
  customer_name: string;
  phone?: string | null;
  amount: number;
  paid_amount: number;
  outstanding: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupRow {
  name: string;
  path: string;
  size: number;
  created_at: string;
}

export interface AppLogRow {
  id: number;
  level: string;
  source: string;
  message: string;
  created_at: string;
}

export function healthCheck() {
  return invokeCommand<HealthCheck>("health_check");
}

export function dbInit() {
  return invokeCommand<{ ok: boolean; path: string }>("db_init");
}

export function setupStatus() {
  return invokeCommand<SetupStatus>("setup_status");
}

export function createAdmin(payload: { name: string; username: string; password: string }) {
  return invokeCommand<PublicUser>("create_admin", { payload });
}

export function listUsers() {
  return invokeCommand<PublicUser[]>("list_users");
}

export function createUser(payload: { name: string; username: string; password: string; role: "admin" | "kasir" }) {
  return invokeCommand<PublicUser>("create_user", { payload });
}

export function login(payload: { username: string; password: string }) {
  return invokeCommand<{ ok: boolean; user: PublicUser }>("login", { payload });
}

export function logoutSession() {
  return invokeCommand<boolean>("logout");
}

export function listAccounts() {
  return invokeCommand<AccountRow[]>("list_accounts");
}

export function createAccount(payload: {
  code: string;
  name: string;
  initial_balance?: number;
  min_balance?: number;
  icon?: string;
  color?: string;
}) {
  return invokeCommand<AccountRow>("create_account", { payload });
}

export function adjustAccountBalance(payload: { account_id: number; amount: number; notes?: string }) {
  return invokeCommand<AccountRow>("adjust_account_balance", { payload });
}

export function transferAccounts(payload: { from_account_id: number; to_account_id: number; amount: number; notes?: string }) {
  return invokeCommand<boolean>("transfer_accounts", { payload });
}

export function ownerDraw(payload: { account_id: number; amount: number; notes?: string }) {
  return invokeCommand<AccountRow>("owner_draw", { payload });
}

export function bankFee(payload: { account_id: number; amount: number; notes?: string }) {
  return invokeCommand<AccountRow>("bank_fee", { payload });
}

export function listAccountMutations(options: { limit?: number } = {}) {
  return invokeCommand<AccountMutationRow[]>("list_account_mutations", { payload: options });
}

export function listCategories() {
  return invokeCommand<CategoryRow[]>("list_categories");
}

export function createCategory(payload: { name: string; icon?: string; color?: string }) {
  return invokeCommand<CategoryRow>("create_category", { payload });
}

export function listProducts() {
  return invokeCommand<ProductRow[]>("list_products");
}

export function listTransactions(options: { limit?: number } = {}) {
  return invokeCommand<TransactionRow[]>("list_transactions", { payload: options });
}

export function listTransactionItems(payload: { transaction_id: number }) {
  return invokeCommand<TransactionItemRow[]>("list_transaction_items", { payload });
}

export function listAppLogs(options: { limit?: number } = {}) {
  return invokeCommand<AppLogRow[]>("list_app_logs", { payload: options });
}

export function createDatabaseBackup() {
  return invokeCommand<BackupRow>("create_database_backup");
}

export function listDatabaseBackups() {
  return invokeCommand<BackupRow[]>("list_database_backups");
}

export function restoreDatabaseBackup(payload: { path: string }) {
  return invokeCommand<boolean>("restore_database_backup", { payload });
}

export function listDebts(options: { limit?: number } = {}) {
  return invokeCommand<DebtRow[]>("list_debts", { payload: options });
}

export function createDebt(payload: { customer_name: string; phone?: string; amount: number; notes?: string }) {
  return invokeCommand<DebtRow>("create_debt", { payload });
}

export function addDebtPayment(payload: { debt_id: number; amount: number; notes?: string }) {
  return invokeCommand<DebtRow>("add_debt_payment", { payload });
}

export function buildDebtReminder(payload: { debt_id: number }) {
  return invokeCommand<string>("build_debt_reminder", { payload });
}

export function createAgentTransaction(payload: {
  service_name: string;
  customer_name?: string;
  amount: number;
  fee: number;
  provider_cost?: number;
  account_id?: number | null;
  cash_effect: number;
  bank_effect: number;
  notes?: string;
}) {
  return invokeCommand<TransactionRow>("create_agent_transaction", { payload });
}

export type ProductInput = {
  name: string;
  barcode?: string;
  category_id?: number | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit?: string;
  image_data_url?: string | null;
  remove_image?: boolean;
};

export function createProduct(payload: ProductInput) {
  return invokeCommand<ProductRow>("create_product", { payload });
}

export function updateProduct(payload: ProductInput & { id: number }) {
  return invokeCommand<ProductRow>("update_product", { payload });
}

export function deactivateProduct(payload: { id: number }) {
  return invokeCommand<boolean>("deactivate_product", { payload });
}

export function getProductImage(payload: { id: number }) {
  return invokeCommand<string | null>("get_product_image", { payload });
}

export function checkoutPosCash(payload: {
  customer_name?: string;
  notes?: string;
  payment_method?: "cash" | "transfer" | "qris";
  settlement_account_id?: number | null;
  items: Array<{ product_id: number; quantity: number }>;
  agent_items?: Array<{
    service_name: string;
    customer_name?: string;
    amount: number;
    fee: number;
    provider_cost?: number;
    account_id?: number | null;
    cash_effect?: number;
    bank_effect?: number;
    notes?: string;
  }>;
}) {
  return invokeCommand<PosCheckoutResponse>("checkout_pos_cash", { payload });
}

export function listAgentServices() {
  return invokeCommand<AgentServiceRow[]>("list_agent_services");
}

export function createAgentService(payload: { name: string; category?: string; default_fee: number; provider_cost?: number }) {
  return invokeCommand<AgentServiceRow>("create_agent_service", { payload });
}

export function listFeeTiers(service_id: number) {
  return invokeCommand<FeeTierRow[]>("list_fee_tiers", { serviceId: service_id, service_id });
}

export function createFeeTier(payload: { service_id: number; min_amount: number; max_amount?: number | null; fee: number; provider_cost?: number }) {
  return invokeCommand<FeeTierRow>("create_fee_tier", { payload });
}

export function printThermalReceipt(payload: {
  host: string;
  port?: number;
  store_name?: string;
  invoice_no: string;
  payment_method: string;
  total_amount: number;
  cash_received?: number;
  change_amount?: number;
  items: Array<{ name: string; quantity: number; unit_price: number; subtotal: number }>;
}) {
  return invokeCommand<boolean>("print_thermal_receipt", { payload });
}

// ── Missing API wrappers (from evaluation report) ──────────────

export function getMe() {
  return invokeCommand<PublicUser>("get_me");
}

export function updateUser(payload: { id: number; name?: string; username?: string; password?: string; role?: string }) {
  return invokeCommand<PublicUser>("update_user", { payload });
}

export function deactivateUser(payload: { id: number }) {
  return invokeCommand<boolean>("deactivate_user", { payload });
}

export function setupComplete(payload: {
  admin_name: string;
  admin_username: string;
  admin_password: string;
  store_name?: string;
  store_owner_name?: string;
  cash_opening_balance?: number;
  kas_only?: boolean;
}) {
  return invokeCommand<{ ok: boolean; user: PublicUser; cash_opening_balance: number; kas_only: boolean }>("setup_complete", { payload, session: {} });
}

export function getTransaction(id: number) {
  return invokeCommand<TransactionRow>("get_transaction", { id });
}

export function transactionAction(payload: { id: number; action: "void" | "reverse" | "complete"; reason?: string; reference_no?: string }) {
  return invokeCommand<TransactionRow>("transaction_action", { payload });
}

export function getSettings() {
  return invokeCommand<Record<string, string>>("get_settings");
}

export function updateSettings(payload: Record<string, string>) {
  return invokeCommand<boolean>("update_settings", { payload });
}

export function updateCategory(payload: { id: number; name?: string; icon?: string; color?: string }) {
  return invokeCommand<CategoryRow>("update_category", { payload });
}

export function deactivateCategory(payload: { id: number }) {
  return invokeCommand<boolean>("deactivate_category", { payload });
}

export function getDashboard() {
  return invokeCommand<{ today_all: { count: number; revenue: number; profit: number }; today_pos: { count: number; revenue: number; profit: number }; today_brilink: { count: number; revenue: number; profit: number }; low_stock: Array<{ id: number; name: string; stock: number; min_stock: number }>; recent_transactions: TransactionRow[]; last_7_days: Array<{ date: string; revenue: number; profit: number }>; accounts: Array<{ id: number; name: string; balance: number }>; pending_count: number }>("get_dashboard", { payload: null });
}

export function getPosReport(payload?: { start?: string; end?: string }) {
  return invokeCommand<{ summary: { count: number; revenue: number; profit: number; cogs: number; average: number }; by_payment: Array<{ payment_method: string; count: number; revenue: number; profit: number }>; products: Array<{ product_name: string; quantity: number; revenue: number; profit: number }>; daily: Array<{ date: string; revenue: number; profit: number }> }>("get_pos_report", { payload: payload || null });
}

export function getMutationSummary(payload?: { account_id?: number; start?: string; end?: string }) {
  return invokeCommand<{ total_in: number; total_out: number; net: number }>("get_mutation_summary", { payload: payload || null });
}

export function updateAccount(payload: { id: number; name?: string; icon?: string; color?: string; min_balance?: number }) {
  return invokeCommand<AccountRow>("update_account", { payload });
}

export function deactivateAccount(accountId: number) {
  return invokeCommand<boolean>("deactivate_account", { account_id: accountId });
}

export function listAgentServicesWithLimit(limit?: number) {
  return invokeCommand<AgentServiceRow[]>("list_agent_services", { payload: limit || null });
}

// ── WhatsApp API wrappers ──────────────────────────────────────────

export interface WhatsAppStatus {
  running: boolean;
  pid?: number | null;
  qr_code?: string | null;
  phone_number?: string | null;
  last_heartbeat?: string | null;
  error?: string | null;
}

export function whatsappStatus() {
  return invokeCommand<WhatsAppStatus>("whatsapp_status");
}

export function whatsappStart() {
  return invokeCommand<boolean>("whatsapp_start");
}

export function whatsappRestart() {
  return invokeCommand<boolean>("whatsapp_restart");
}

export function whatsappLogout() {
  return invokeCommand<boolean>("whatsapp_logout");
}

export function whatsappNotify(payload: { phone: string; message: string }) {
  return invokeCommand<boolean>("whatsapp_notify", { payload });
}

// ── Restock (stock receiving) ─────────────────────────────────────

export function restockProduct(payload: { product_id: number; quantity: number; notes?: string; cost_price?: number }) {
  return invokeCommand<ProductRow>("restock_product", { payload });
}
