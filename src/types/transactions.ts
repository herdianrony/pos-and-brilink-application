export interface Trx {
  id: number;
  invoiceNo: string;
  type: string;
  subType: string | null;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: string;
  adminFee: string | null;
  profit: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  status?: string | null;
  referenceNo?: string | null;
  flowType?: string | null;
  feeMethod?: string | null;
  cashReceived?: string | null;
  cashDispensed?: string | null;
  settlementAccountId?: number | null;
  confirmedAt?: string | null;
  confirmedByUserId?: number | null;
}

export interface TrxDetail extends Trx {
  items: Array<{ id: number; productName: string; quantity: number; unitPrice: string; subtotal: string }>;
  denominations?: Array<{ id: number; denomination: number; count: number; subtotal: number }>;
}

export type TransactionActionType = "complete" | "void" | "reverse";

export interface TransactionActionState {
  type: TransactionActionType;
  trx: Trx | null;
}
