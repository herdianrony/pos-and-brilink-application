export interface Account {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  balance: string;
  minBalance: string | null;
  isActive?: boolean;
}

export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  buyPrice: string;
  sellPrice: string;
  stock: number;
  minStock: number;
  unit: string | null;
  image?: string | null;
  isActive?: boolean;
  createdAt?: string | Date;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  color?: string | null;
  isActive?: boolean;
  productCount?: number;
  createdAt?: string | Date;
}

export interface ServiceCategory {
  id: number;
  code?: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive?: boolean;
}

export interface FeeTier {
  id?: number;
  serviceId?: number;
  minAmount: string;
  maxAmount: string | null;
  adminFee: string;
  agentFee: string;
}

export interface AgentService {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  icon: string | null;
  adminFee: string;
  agentFee: string;
  useTieredFee: boolean;
  feeTiers: FeeTier[];
  cashEffect: string;
  bankEffect: string;
  flowType?: string | null;
  defaultFeeMethod?: string | null;
  description: string | null;
  isActive?: boolean;
}

export interface AccountMutation {
  id: number;
  accountId: number;
  accountName: string | null;
  accountIcon: string | null;
  accountColor?: string | null;
  type: string;
  amount: string | number;
  balanceAfter: string | number;
  notes: string | null;
  referenceId: number | null;
  createdAt: string;
}

export interface CartItem {
  productId: number;
  productName: string;
  unitPrice: string;
  buyPrice: string;
  quantity: number;
  subtotal: string;
  stock: number;
  unit: string | null;
}
