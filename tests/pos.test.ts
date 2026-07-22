import { describe, it, expect } from "vitest";
import type { CartItem } from "@/types/models";
import {
  addProductToCart,
  calculateCartTotal,
  calculateChange,
  calculateDiscountAmount,
  calculateGrandTotal,
  calculateTotalItems,
  createHeldCart,
  updateCartQuantity,
  type HeldCart,
} from "@/lib/pos-cart";

describe("POS Cart: addProductToCart", () => {
  const mockProduct = {
    id: 1,
    name: "Indomie Goreng",
    sellPrice: "3500",
    buyPrice: "2500",
    stock: 50,
    unit: "pcs",
  };

  it("should add new product to empty cart", () => {
    const cart = addProductToCart([], mockProduct);
    expect(cart).toHaveLength(1);
    expect(cart[0].productId).toBe(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].subtotal).toBe("3500");
  });

  it("should increment quantity if product already in cart", () => {
    const existing: CartItem[] = [{ productId: 1, productName: "Indomie", unitPrice: "3500", buyPrice: "2500", quantity: 1, subtotal: "3500", stock: 50, unit: "pcs" }];
    const cart = addProductToCart(existing, mockProduct);
    expect(cart.find(c => c.productId === 1)?.quantity).toBe(2);
    expect(cart.find(c => c.productId === 1)?.subtotal).toBe("7000");
  });

  it("should not add if stock is 0", () => {
    expect(addProductToCart([], { ...mockProduct, stock: 0 })).toHaveLength(0);
  });

  it("should not exceed stock limit", () => {
    const existing: CartItem[] = [{ productId: 1, productName: "Indomie", unitPrice: "3500", buyPrice: "2500", quantity: 50, subtotal: "175000", stock: 50, unit: "pcs" }];
    expect(addProductToCart(existing, mockProduct)[0].quantity).toBe(50);
  });
});

describe("POS Cart: updateCartQuantity", () => {
  const mockCart: CartItem[] = [
    { productId: 1, productName: "Item A", unitPrice: "1000", buyPrice: "500", quantity: 3, subtotal: "3000", stock: 10, unit: "pcs" },
  ];

  it("should increment quantity", () => {
    const cart = updateCartQuantity(mockCart, 1, 1);
    expect(cart[0].quantity).toBe(4);
    expect(cart[0].subtotal).toBe("4000");
  });

  it("should decrement quantity", () => {
    const cart = updateCartQuantity(mockCart, 1, -1);
    expect(cart[0].quantity).toBe(2);
    expect(cart[0].subtotal).toBe("2000");
  });

  it("should not go below 1", () => {
    expect(updateCartQuantity(mockCart, 1, -10)[0].quantity).toBe(3);
  });

  it("should not exceed stock", () => {
    expect(updateCartQuantity(mockCart, 1, 100)[0].quantity).toBe(3);
  });
});

describe("POS Cart totals", () => {
  it("should calculate total from cart items", () => {
    const cart: CartItem[] = [
      { productId: 1, productName: "A", unitPrice: "1000", buyPrice: "500", quantity: 2, subtotal: "2000", stock: 10, unit: "pcs" },
      { productId: 2, productName: "B", unitPrice: "5000", buyPrice: "3000", quantity: 1, subtotal: "5000", stock: 5, unit: "pcs" },
    ];
    expect(calculateCartTotal(cart)).toBe(7000);
    expect(calculateTotalItems(cart)).toBe(3);
  });

  it("should return 0 for empty cart", () => {
    expect(calculateCartTotal([])).toBe(0);
    expect(calculateTotalItems([])).toBe(0);
  });
});

describe("POS Discount", () => {
  const total = 100000;

  it("should return 0 for none type", () => {
    expect(calculateDiscountAmount(total, "none", "")).toBe(0);
  });

  it("should calculate and cap percentage discount", () => {
    expect(calculateDiscountAmount(total, "percent", "10")).toBe(10000);
    expect(calculateDiscountAmount(total, "percent", "50")).toBe(50000);
    expect(calculateDiscountAmount(total, "percent", "150")).toBe(100000);
  });

  it("should calculate and cap rupiah discount", () => {
    expect(calculateDiscountAmount(total, "rupiah", "5000")).toBe(5000);
    expect(calculateDiscountAmount(total, "rupiah", "150000")).toBe(100000);
  });

  it("should handle empty and invalid value", () => {
    expect(calculateDiscountAmount(total, "percent", "")).toBe(0);
    expect(calculateDiscountAmount(total, "rupiah", "")).toBe(0);
    expect(calculateDiscountAmount(total, "percent", "abc")).toBe(0);
  });

  it("should subtract discount from total", () => {
    expect(calculateGrandTotal(100000, 10000)).toBe(90000);
    expect(calculateGrandTotal(100000, 0)).toBe(100000);
  });
});

describe("POS: calculateChange", () => {
  it("should calculate change correctly", () => {
    expect(calculateChange("150000", 100000)).toBe(50000);
  });

  it("should return negative if insufficient", () => {
    expect(calculateChange("50000", 100000)).toBe(-50000);
  });

  it("should return 0 for exact amount", () => {
    expect(calculateChange("100000", 100000)).toBe(0);
  });

  it("should handle empty cash amount", () => {
    expect(calculateChange("", 100000)).toBe(-100000);
  });
});

describe("POS Hold: createHeldCart", () => {
  const mockCart: CartItem[] = [
    { productId: 1, productName: "A", unitPrice: "1000", buyPrice: "500", quantity: 2, subtotal: "2000", stock: 10, unit: "pcs" },
  ];

  it("should create held cart", () => {
    const held = createHeldCart(mockCart, "Customer 1", 12345);
    expect(held).not.toBeNull();
    expect(held?.id).toBe("12345");
    expect(held?.cart).toHaveLength(1);
    expect(held?.customerName).toBe("Customer 1");
  });

  it("should not hold empty cart", () => {
    expect(createHeldCart([], "Customer 1")).toBeNull();
  });

  it("should resume held cart by filtering caller state", () => {
    const held: HeldCart = createHeldCart(mockCart, "Customer 1", 1)!;
    const heldCarts = [held];
    const newCart = held.cart;
    const newHeld = heldCarts.filter(h => h.id !== held.id);
    expect(newCart).toHaveLength(1);
    expect(newHeld).toHaveLength(0);
  });
});
