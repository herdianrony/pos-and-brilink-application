import type { CartItem, Product } from "@/types/models";

export type DiscountType = "none" | "percent" | "rupiah";

export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
}

export function calculateTotalItems(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateDiscountAmount(total: number, type: DiscountType, value: string): number {
  if (type === "none" || !value) return 0;
  const parsed = parseFloat(value) || 0;
  if (type === "percent") {
    return (total * Math.min(parsed, 100)) / 100;
  }
  return Math.min(parsed, total);
}

export function calculateGrandTotal(total: number, discount: number): number {
  return total - discount;
}

export function calculateChange(cashAmount: string, grandTotal: number): number {
  return parseFloat(cashAmount || "0") - grandTotal;
}

export function addProductToCart(
  cart: CartItem[],
  product: Pick<Product, "id" | "name" | "sellPrice" | "buyPrice" | "stock" | "unit">
): CartItem[] {
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    if (existing.quantity >= product.stock) return cart;
    return cart.map((item) =>
      item.productId === product.id
        ? {
            ...item,
            quantity: item.quantity + 1,
            subtotal: ((item.quantity + 1) * parseFloat(item.unitPrice)).toString(),
          }
        : item
    );
  }

  if (product.stock <= 0) return cart;

  return [
    ...cart,
    {
      productId: product.id,
      productName: product.name,
      unitPrice: product.sellPrice,
      buyPrice: product.buyPrice,
      quantity: 1,
      subtotal: product.sellPrice,
      stock: product.stock,
      unit: product.unit,
    },
  ];
}

export function updateCartQuantity(cart: CartItem[], productId: number, delta: number): CartItem[] {
  return cart.map((item) => {
    if (item.productId !== productId) return item;
    const quantity = item.quantity + delta;
    if (quantity <= 0 || quantity > item.stock) return item;
    return {
      ...item,
      quantity,
      subtotal: (quantity * parseFloat(item.unitPrice)).toString(),
    };
  });
}

export interface HeldCart {
  id: string;
  cart: CartItem[];
  customerName: string;
  timestamp: number;
}

export function createHeldCart(cart: CartItem[], customerName: string, now = Date.now()): HeldCart | null {
  if (cart.length === 0) return null;
  return {
    id: now.toString(),
    cart: [...cart],
    customerName,
    timestamp: now,
  };
}
