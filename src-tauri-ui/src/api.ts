import { invoke } from "@tauri-apps/api/core";

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
  balance: number;
  is_active: boolean;
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
  is_active: boolean;
}

export interface PosCheckoutResponse {
  ok: boolean;
  transaction_id: number;
  invoice_no: string;
  total_amount: number;
  profit: number;
  cash_balance: number;
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

export function healthCheck() {
  return invoke<HealthCheck>("health_check");
}

export function dbInit() {
  return invoke<{ ok: boolean; path: string }>("db_init");
}

export function setupStatus() {
  return invoke<SetupStatus>("setup_status");
}

export function createAdmin(payload: { name: string; username: string; password: string }) {
  return invoke<PublicUser>("create_admin", { payload });
}

export function login(payload: { username: string; password: string }) {
  return invoke<{ ok: boolean; user: PublicUser }>("login", { payload });
}

export function listAccounts() {
  return invoke<AccountRow[]>("list_accounts");
}

export function listCategories() {
  return invoke<CategoryRow[]>("list_categories");
}

export function createCategory(payload: { name: string; icon?: string; color?: string }) {
  return invoke<CategoryRow>("create_category", { payload });
}

export function listProducts() {
  return invoke<ProductRow[]>("list_products");
}

export function listTransactions() {
  return invoke<TransactionRow[]>("list_transactions");
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
}) {
  return invoke<ProductRow>("create_product", { payload });
}

export function checkoutPosCash(payload: {
  customer_name?: string;
  notes?: string;
  items: Array<{ product_id: number; quantity: number }>;
}) {
  return invoke<PosCheckoutResponse>("checkout_pos_cash", { payload });
}
