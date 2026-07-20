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
