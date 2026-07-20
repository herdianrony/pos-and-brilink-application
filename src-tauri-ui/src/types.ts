import type { ProductRow } from "./api";

export type CartItem = { product: ProductRow; quantity: number };

export type ReceiptState = {
  invoice_no: string;
  payment_method: "cash" | "transfer" | "qris";
  total_amount: number;
  created_at: string;
  items: CartItem[];
};

export type ViewKey =
  | "dashboard"
  | "pos"
  | "brilink"
  | "products"
  | "history"
  | "debts"
  | "rekeningKoran"
  | "cash"
  | "reports"
  | "logs"
  | "settings";

export type IconName =
  | "dashboard"
  | "pos"
  | "brilink"
  | "products"
  | "history"
  | "debts"
  | "rekeningKoran"
  | "cash"
  | "reports"
  | "logs"
  | "settings"
  | "search";

export type AgentForm = {
  service_name: string;
  customer_name: string;
  amount: string;
  fee: string;
  provider_cost: string;
  account_id: string;
  cash_effect: string;
  bank_effect: string;
  notes: string;
};
