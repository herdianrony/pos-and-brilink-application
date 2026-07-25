/**
 * API layer — replaces Tauri invoke() with fetch('/api/...').
 *
 * Session token is stored in localStorage and sent as Bearer token.
 * All functions mirror the original invoke() signatures exactly,
 * so the rest of the frontend doesn't need changes.
 */

import { mockInvoke } from "./mockApi";

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;

// ── Session storage ──────────────────────────────────────────────

let _token: string | null = null;

export function setToken(token: string | null) {
  _token = token;
  if (token) {
    try { localStorage.setItem('session_token', token); } catch {}
  } else {
    try { localStorage.removeItem('session_token'); } catch {}
  }
}

export function getToken(): string | null {
  if (!_token) {
    try { _token = localStorage.getItem('session_token'); } catch {}
  }
  return _token;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── Fetch wrapper ────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // In e2e mode, use mock
  if (env?.VITE_TAURI_UI_E2E === "1") {
    // Extract command name from path for mock
    const command = pathToMockCommand(path, options);
    if (command) return mockInvoke<T>(command, options.body ? JSON.parse(options.body as string) : undefined);
  }

  const url = `/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    const error = data.error || `Request failed: ${res.status}`;
    throw new Error(error);
  }
  return data as T;
}

// Map API paths back to mock command names for e2e testing
function pathToMockCommand(path: string, options: RequestInit): string | null {
  const map: Record<string, string> = {
    'GET /health': 'health_check',
    'POST /auth/login': 'login',
    'POST /auth/logout': 'logout',
    'GET /auth/me': 'get_me',
    'GET /setup/status': 'setup_status',
    'POST /setup/complete': 'setup_complete',
    'GET /accounts': 'list_accounts',
    'POST /accounts': 'create_account',
    'GET /accounts/mutations': 'list_account_mutations',
    'GET /accounts/mutation-summary': 'get_mutation_summary',
    'GET /categories': 'list_categories',
    'GET /products': 'list_products',
    'GET /transactions': 'list_transactions',
    'GET /logs': 'list_app_logs',
    'GET /backups': 'list_database_backups',
    'GET /debts': 'list_debts',
    'GET /agent/services': 'list_agent_services',
    'GET /dashboard': 'get_dashboard',
  };

  const method = (options.method || 'GET').toUpperCase();
  return map[`${method} ${path}`] || null;
}

// ── Types ─────────────────────────────────────────────────────────

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
  user_id?: number | null;
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

export interface WhatsAppStatus {
  status: string;
  qr_data_url?: string | null;
  last_error?: string | null;
  has_client: boolean;
  enabled: boolean;
  auto_notify_owner: boolean;
  owner_number?: string | null;
}

// ── Health & Setup ──────────────────────────────────────────────

export function healthCheck() {
  return apiFetch<HealthCheck>('/health');
}

export function dbInit() {
  return apiFetch<{ ok: boolean; path: string }>('/db/init', { method: 'POST' });
}

export function setupStatus() {
  return apiFetch<SetupStatus>('/setup/status');
}

export function createAdmin(payload: { name: string; username: string; password: string }) {
  return apiFetch<PublicUser>('/auth/setup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setupComplete(payload: {
  admin_name: string;
  admin_username: string;
  admin_password: string;
  store_name?: string;
  store_owner_name?: string;
  store_phone?: string;
  store_address?: string;
  cash_opening_balance?: number;
  kas_only?: boolean;
}) {
  return apiFetch<{ ok: boolean; token: string; user: PublicUser; cash_opening_balance: number; kas_only: boolean }>('/setup/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => {
    if (res.token) setToken(res.token);
    return res;
  });
}

// ── Auth ──────────────────────────────────────────────────────────

export function login(payload: { username: string; password: string }) {
  return apiFetch<{ ok: boolean; token: string; user: PublicUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => {
    if (res.token) setToken(res.token);
    return res;
  });
}

export function logoutSession() {
  setToken(null);
  return apiFetch<boolean>('/auth/logout', { method: 'POST' });
}

export function getMe() {
  return apiFetch<PublicUser>('/auth/me');
}

// ── Users ─────────────────────────────────────────────────────────

export function listUsers() {
  return apiFetch<PublicUser[]>('/users');
}

export function createUser(payload: { name: string; username: string; password: string; role: "admin" | "kasir" }) {
  return apiFetch<PublicUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(payload: { id: number; name?: string; username?: string; password?: string; role?: string }) {
  return apiFetch<PublicUser>('/users', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deactivateUser(payload: { id: number }) {
  return apiFetch<boolean>(`/users/${payload.id}`, { method: 'DELETE' });
}

// ── Accounts ───────────────────────────────────────────────────────

export function listAccounts() {
  return apiFetch<AccountRow[]>('/accounts');
}

export function createAccount(payload: {
  code: string;
  name: string;
  initial_balance?: number;
  min_balance?: number;
  icon?: string;
  color?: string;
}) {
  return apiFetch<AccountRow>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAccount(payload: {
  id: number;
  name?: string;
  icon?: string;
  color?: string;
  min_balance?: number;
  is_active?: boolean;
}) {
  return apiFetch<boolean>('/accounts', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deactivateAccount(accountId: number) {
  return apiFetch<boolean>(`/accounts/${accountId}`, { method: 'DELETE' });
}

export function adjustAccountBalance(payload: { account_id: number; amount: number; notes?: string }) {
  return apiFetch<AccountRow>('/accounts/adjust', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function transferAccounts(payload: { from_account_id: number; to_account_id: number; amount: number; notes?: string }) {
  return apiFetch<boolean>('/accounts/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function ownerDraw(payload: { account_id: number; amount: number; notes?: string }) {
  return apiFetch<AccountRow>('/accounts/owner-draw', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function bankFee(payload: { account_id: number; amount: number; notes?: string }) {
  return apiFetch<AccountRow>('/accounts/bank-fee', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listAccountMutations(options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  return apiFetch<AccountMutationRow[]>(`/accounts/mutations?${params}`);
}

export function getMutationSummary(options: { account_id?: number; start_date?: string; end_date?: string } = {}) {
  const params = new URLSearchParams();
  if (options.account_id) params.set('account_id', String(options.account_id));
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);
  return apiFetch<{ total_in: number; total_out: number; net: number; count: number; opening_balance: number; closing_balance: number }>(`/accounts/mutation-summary?${params}`);
}

// ── Categories ───────────────────────────────────────────────────

export function listCategories() {
  return apiFetch<CategoryRow[]>('/categories');
}

export function createCategory(payload: { name: string; icon?: string; color?: string }) {
  return apiFetch<CategoryRow>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCategory(payload: { id: number; name?: string; icon?: string; color?: string }) {
  return apiFetch<CategoryRow>('/categories', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deactivateCategory(payload: { category_id: number }) {
  return apiFetch<boolean>(`/categories/${payload.category_id}`, { method: 'DELETE' });
}

// ── Products ───────────────────────────────────────────────────────

export function listProducts(options: { search?: string; category_id?: number } = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.category_id) params.set('category_id', String(options.category_id));
  return apiFetch<ProductRow[]>(`/products?${params}`);
}

export function createProduct(payload: {
  name: string;
  barcode?: string;
  category_id?: number | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit?: string;
  image_data_url?: string | null;
}) {
  return apiFetch<ProductRow>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(payload: {
  id: number;
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
}) {
  return apiFetch<ProductRow>('/products', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deactivateProduct(payload: { id: number }) {
  return apiFetch<boolean>(`/products/${payload.id}`, { method: 'DELETE' });
}

export function getProductImage(payload: { id: number }) {
  return apiFetch<{ data_url: string | null }>(`/products/${payload.id}/image`);
}

export function restockProduct(payload: { product_id: number; quantity: number; notes?: string; cost_price?: number }) {
  return apiFetch<ProductRow>('/products/restock', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Transactions ──────────────────────────────────────────────────

export function listTransactions(options: { limit?: number; transaction_type?: string; start_date?: string; end_date?: string } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.transaction_type) params.set('transaction_type', options.transaction_type);
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);
  return apiFetch<TransactionRow[]>(`/transactions?${params}`);
}

export function getTransaction(id: number) {
  return apiFetch<TransactionRow>(`/transactions/${id}`);
}

export function listTransactionItems(payload: { transaction_id: number }) {
  return apiFetch<TransactionItemRow[]>(`/transactions/${payload.transaction_id}/items`);
}

export function transactionAction(payload: {
  id: number;
  action: "void" | "reverse" | "complete";
  reason?: string;
  reference_no?: string;
}) {
  return apiFetch<TransactionRow>(`/transactions/${payload.id}/action`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
  discount?: number;
  discount_reason?: string;
  discount_admin_pin?: string;
}) {
  return apiFetch<PosCheckoutResponse>('/transactions/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
  return apiFetch<TransactionRow>('/transactions/agent', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────

export function getDashboard() {
  return apiFetch<{
    today_all: { count: number; revenue: number; profit: number };
    today_pos: { count: number; revenue: number; profit: number };
    today_brilink: { count: number; revenue: number; profit: number };
    low_stock: Array<{ id: number; name: string; stock: number; min_stock: number }>;
    recent_transactions: TransactionRow[];
    last_7_days: Array<{ date: string; revenue: number; profit: number }>;
    accounts: Array<{ id: number; name: string; balance: number }>;
    pending_count: number;
  }>('/dashboard');
}

export function getPosReport(payload?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (payload?.start) params.set('start', payload.start);
  if (payload?.end) params.set('end', payload.end);
  return apiFetch<{
    summary: { count: number; revenue: number; profit: number; cogs: number; average: number };
    by_payment: Array<{ payment_method: string; count: number; revenue: number; profit: number }>;
    products: Array<{ product_name: string; quantity: number; revenue: number; profit: number }>;
    daily: Array<{ date: string; revenue: number; profit: number }>;
  }>(`/dashboard/pos-report?${params}`);
}

// ── Debts ──────────────────────────────────────────────────────────

export function listDebts(options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  return apiFetch<DebtRow[]>(`/debts?${params}`);
}

export function createDebt(payload: { customer_name: string; phone?: string; amount: number; notes?: string }) {
  return apiFetch<DebtRow>('/debts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addDebtPayment(payload: { debt_id: number; amount: number; notes?: string }) {
  return apiFetch<DebtRow>(`/debts/${payload.debt_id}/payment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function buildDebtReminder(payload: { debt_id: number }) {
  return apiFetch<{ text: string; debt_id: number; customer_name: string; outstanding: number }>(`/debts/${payload.debt_id}/reminder`);
}

// ── Agent Services ──────────────────────────────────────────────

export function listAgentServices(options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  return apiFetch<AgentServiceRow[]>(`/agent/services?${params}`);
}

export function createAgentService(payload: { name: string; category?: string; default_fee: number; provider_cost?: number }) {
  return apiFetch<AgentServiceRow>('/agent/services', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listFeeTiers(serviceId: number) {
  return apiFetch<FeeTierRow[]>(`/agent/services/${serviceId}/fees`);
}

export function createFeeTier(payload: { service_id: number; min_amount: number; max_amount?: number | null; fee: number; provider_cost?: number }) {
  return apiFetch<FeeTierRow>(`/agent/services/${payload.service_id}/fees`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Settings ──────────────────────────────────────────────────────

export function getSettings() {
  return apiFetch<Record<string, string>>('/settings');
}

export function updateSettings(settings: Record<string, string>) {
  return apiFetch<boolean>('/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}

// ── Backup & Logs ─────────────────────────────────────────────────

export function listAppLogs(options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  return apiFetch<AppLogRow[]>(`/logs?${params}`);
}

export function createDatabaseBackup() {
  return apiFetch<BackupRow>('/backups', { method: 'POST' });
}

export function listDatabaseBackups() {
  return apiFetch<BackupRow[]>('/backups');
}

export function restoreDatabaseBackup(payload: { path: string }) {
  return apiFetch<boolean>('/backups/restore', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Seed & Demo ──────────────────────────────────────────────────

export function seedSystem() {
  return apiFetch<{ message: string; stats: Record<string, number> }>('/seed/system', { method: 'POST' });
}

export function setupTemplates() {
  return apiFetch<{ templates: AccountRow[]; cash_account: AccountRow | null }>('/setup/templates');
}

export function seedDemo() {
  return apiFetch<{ message: string; stats: Record<string, number> }>('/seed/demo', { method: 'POST' });
}

export function clearDemo() {
  return apiFetch<{ message: string }>('/seed/clear', { method: 'POST' });
}

// ── Printer ─────────────────────────────────────────────────────────

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
  return apiFetch<boolean>('/printer/receipt', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── WhatsApp ────────────────────────────────────────────────────────

export function whatsappStatus() {
  return apiFetch<WhatsAppStatus>('/whatsapp/status');
}

export function whatsappStart() {
  return apiFetch<WhatsAppStatus>('/whatsapp/start', { method: 'POST' });
}

export function whatsappRestart() {
  return apiFetch<WhatsAppStatus>('/whatsapp/restart', { method: 'POST' });
}

export function whatsappLogout() {
  return apiFetch<{ ok: boolean }>('/whatsapp/logout', { method: 'POST' });
}

export function whatsappNotify(transactionId: number) {
  return apiFetch<{ sent: boolean; reason?: string; id?: string }>('/whatsapp/notify', {
    method: 'POST',
    body: JSON.stringify({ transaction_id: transactionId }),
  });
}

// ── Re-exports for ProductInput type used by frontend ────────────

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
