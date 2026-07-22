import type { ProductRow } from "./api";

export type ProductCartItem = { type: "product"; product: ProductRow; quantity: number };
export type AgentCartItem = {
  type: "agent";
  id: string;
  service_name: string;
  customer_name?: string;
  amount: number;
  fee: number;
  provider_cost: number;
  account_id?: number | null;
  cash_effect: number;
  bank_effect: number;
  notes?: string;
};
export type CartItem = ProductCartItem | AgentCartItem;

export type ReceiptState = {
  invoice_no: string;
  payment_method: "cash" | "transfer" | "qris";
  total_amount: number;
  cash_received?: number;
  change_amount?: number;
  created_at: string;
  items: CartItem[];
};

export type ViewKey =
  | "dashboard"
  | "pos"
  | "brilink"
  | "products"
  | "history"
  | "statement"
  | "cash"
  | "settings";

export type IconName =
  | "dashboard"
  | "pos"
  | "brilink"
  | "products"
  | "history"
  | "statement"
  | "cash"
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