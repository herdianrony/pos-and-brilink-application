import { describe, it, expect, beforeEach } from "vitest";

// ── POS Business Logic Tests ─────────────────────
// Test pure functions yang dipakai di POS component
// Tidak test React component langsung (butuh jsdom + complex mock)

interface CartItem {
  productId: number;
  productName: string;
  unitPrice: string;
  buyPrice: string;
  quantity: number;
  subtotal: string;
  stock: number;
  unit: string | null;
}

// ── Cart Calculation Helpers ─────────────────────
// Replikasi logic dari POS.tsx untuk test

function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + parseFloat(c.subtotal), 0);
}

function calculateTotalItems(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.quantity, 0);
}

function calculateDiscount(total: number, type: "none" | "percent" | "rupiah", value: string): number {
  if (type === "none" || !value) return 0;
  const val = parseFloat(value) || 0;
  if (type === "percent") return (total * val) / 100;
  return Math.min(val, total);
}

function calculateGrandTotal(total: number, discount: number): number {
  return total - discount;
}

function calculateChange(cashAmount: string, grandTotal: number): number {
  return parseFloat(cashAmount || "0") - grandTotal;
}

function addToCart(cart: CartItem[], product: { id: number; name: string; sellPrice: string; buyPrice: string; stock: number; unit: string | null }): CartItem[] {
  const existing = cart.find(c => c.productId === product.id);
  if (existing) {
    if (existing.quantity >= product.stock) return cart;
    return cart.map(c =>
      c.productId === product.id
        ? { ...c, quantity: c.quantity + 1, subtotal: ((c.quantity + 1) * parseFloat(c.unitPrice)).toString() }
        : c
    );
  }
  if (product.stock <= 0) return cart;
  return [...cart, {
    productId: product.id,
    productName: product.name,
    unitPrice: product.sellPrice,
    buyPrice: product.buyPrice,
    quantity: 1,
    subtotal: product.sellPrice,
    stock: product.stock,
    unit: product.unit,
  }];
}

function updateQty(cart: CartItem[], productId: number, delta: number): CartItem[] {
  return cart.map(c => {
    if (c.productId !== productId) return c;
    const q = c.quantity + delta;
    if (q <= 0 || q > c.stock) return c;
    return { ...c, quantity: q, subtotal: (q * parseFloat(c.unitPrice)).toString() };
  });
}

// ── Held Cart ────────────────────────────────────
interface HeldCart {
  id: string;
  cart: CartItem[];
  customerName: string;
  timestamp: number;
}

function holdCart(cart: CartItem[], customerName: string, heldCarts: HeldCart[]): { newCart: CartItem[]; newHeld: HeldCart[] } {
  if (cart.length === 0) return { newCart: cart, newHeld: heldCarts };
  const held: HeldCart = {
    id: Date.now().toString(),
    cart: [...cart],
    customerName,
    timestamp: Date.now(),
  };
  return { newCart: [], newHeld: [...heldCarts, held] };
}

function resumeCart(held: HeldCart, currentCart: CartItem[], heldCarts: HeldCart[]): { newCart: CartItem[]; newHeld: HeldCart[] } {
  return {
    newCart: held.cart,
    newHeld: heldCarts.filter(h => h.id !== held.id),
  };
}

// ── Tests ────────────────────────────────────────

describe("POS Cart: addToCart", () => {
  const mockProduct = {
    id: 1,
    name: "Indomie Goreng",
    sellPrice: "3500",
    buyPrice: "2500",
    stock: 50,
    unit: "pcs",
  };

  it("should add new product to empty cart", () => {
    const cart = addToCart([], mockProduct);
    expect(cart).toHaveLength(1);
    expect(cart[0].productId).toBe(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].subtotal).toBe("3500");
  });

  it("should increment quantity if product already in cart", () => {
    const existing: CartItem[] = [{ productId: 1, productName: "Indomie", unitPrice: "3500", buyPrice: "2500", quantity: 1, subtotal: "3500", stock: 50, unit: "pcs" }];
    const cart = addToCart(existing, mockProduct);
    const item = cart.find(c => c.productId === 1);
    expect(item?.quantity).toBe(2);
    expect(item?.subtotal).toBe("7000");
  });

  it("should not add if stock is 0", () => {
    const cart = addToCart([], { ...mockProduct, stock: 0 });
    expect(cart).toHaveLength(0);
  });

  it("should not exceed stock limit", () => {
    const existing: CartItem[] = [{ productId: 1, productName: "Indomie", unitPrice: "3500", buyPrice: "2500", quantity: 50, subtotal: "175000", stock: 50, unit: "pcs" }];
    const cart = addToCart(existing, mockProduct);
    expect(cart[0].quantity).toBe(50); // unchanged
  });
});

describe("POS Cart: updateQty", () => {
  const mockCart: CartItem[] = [
    { productId: 1, productName: "Item A", unitPrice: "1000", buyPrice: "500", quantity: 3, subtotal: "3000", stock: 10, unit: "pcs" },
  ];

  it("should increment quantity", () => {
    const cart = updateQty(mockCart, 1, 1);
    expect(cart[0].quantity).toBe(4);
    expect(cart[0].subtotal).toBe("4000");
  });

  it("should decrement quantity", () => {
    const cart = updateQty(mockCart, 1, -1);
    expect(cart[0].quantity).toBe(2);
    expect(cart[0].subtotal).toBe("2000");
  });

  it("should not go below 1", () => {
    const cart = updateQty(mockCart, 1, -10);
    expect(cart[0].quantity).toBe(3); // unchanged
  });

  it("should not exceed stock", () => {
    const cart = updateQty(mockCart, 1, 100);
    expect(cart[0].quantity).toBe(3); // unchanged
  });
});

describe("POS Cart: calculateCartTotal", () => {
  it("should calculate total from cart items", () => {
    const cart: CartItem[] = [
      { productId: 1, productName: "A", unitPrice: "1000", buyPrice: "500", quantity: 2, subtotal: "2000", stock: 10, unit: "pcs" },
      { productId: 2, productName: "B", unitPrice: "5000", buyPrice: "3000", quantity: 1, subtotal: "5000", stock: 5, unit: "pcs" },
    ];
    expect(calculateCartTotal(cart)).toBe(7000);
  });

  it("should return 0 for empty cart", () => {
    expect(calculateCartTotal([])).toBe(0);
  });
});

describe("POS Cart: calculateTotalItems", () => {
  it("should count total items", () => {
    const cart: CartItem[] = [
      { productId: 1, productName: "A", unitPrice: "1000", buyPrice: "500", quantity: 3, subtotal: "3000", stock: 10, unit: "pcs" },
      { productId: 2, productName: "B", unitPrice: "5000", buyPrice: "3000", quantity: 2, subtotal: "10000", stock: 5, unit: "pcs" },
    ];
    expect(calculateTotalItems(cart)).toBe(5);
  });
});

describe("POS Discount: calculateDiscount", () => {
  const total = 100000;

  it("should return 0 for none type", () => {
    expect(calculateDiscount(total, "none", "")).toBe(0);
  });

  it("should calculate percentage discount", () => {
    expect(calculateDiscount(total, "percent", "10")).toBe(10000);
    expect(calculateDiscount(total, "percent", "50")).toBe(50000);
  });

  it("should calculate rupiah discount", () => {
    expect(calculateDiscount(total, "rupiah", "5000")).toBe(5000);
    expect(calculateDiscount(total, "rupiah", "150000")).toBe(100000); // capped at total
  });

  it("should handle empty value", () => {
    expect(calculateDiscount(total, "percent", "")).toBe(0);
    expect(calculateDiscount(total, "rupiah", "")).toBe(0);
  });

  it("should handle invalid value", () => {
    expect(calculateDiscount(total, "percent", "abc")).toBe(0);
  });
});

describe("POS Discount: calculateGrandTotal", () => {
  it("should subtract discount from total", () => {
    expect(calculateGrandTotal(100000, 10000)).toBe(90000);
  });

  it("should handle zero discount", () => {
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

describe("POS Hold/Resume: holdCart", () => {
  const mockCart: CartItem[] = [
    { productId: 1, productName: "A", unitPrice: "1000", buyPrice: "500", quantity: 2, subtotal: "2000", stock: 10, unit: "pcs" },
  ];

  it("should hold cart and clear current", () => {
    const { newCart, newHeld } = holdCart(mockCart, "Customer 1", []);
    expect(newCart).toHaveLength(0);
    expect(newHeld).toHaveLength(1);
    expect(newHeld[0].cart).toHaveLength(1);
    expect(newHeld[0].customerName).toBe("Customer 1");
  });

  it("should not hold empty cart", () => {
    const { newCart, newHeld } = holdCart([], "Customer 1", []);
    expect(newCart).toHaveLength(0);
    expect(newHeld).toHaveLength(0);
  });

  it("should add to existing held carts", () => {
    const existing: HeldCart[] = [{ id: "1", cart: [], customerName: "Prev", timestamp: 0 }];
    const { newHeld } = holdCart(mockCart, "New", existing);
    expect(newHeld).toHaveLength(2);
  });
});

describe("POS Hold/Resume: resumeCart", () => {
  const held: HeldCart = {
    id: "1",
    cart: [{ productId: 1, productName: "A", unitPrice: "1000", buyPrice: "500", quantity: 2, subtotal: "2000", stock: 10, unit: "pcs" }],
    customerName: "Customer 1",
    timestamp: Date.now(),
  };

  it("should resume held cart", () => {
    const { newCart, newHeld } = resumeCart(held, [], [held]);
    expect(newCart).toHaveLength(1);
    expect(newHeld).toHaveLength(0);
  });

  it("should replace current cart with held cart", () => {
    const currentCart: CartItem[] = [{ productId: 99, productName: "Current", unitPrice: "100", buyPrice: "50", quantity: 1, subtotal: "100", stock: 5, unit: "pcs" }];
    const { newCart } = resumeCart(held, currentCart, [held]);
    expect(newCart).toHaveLength(1);
    expect(newCart[0].productId).toBe(1); // held cart items, not current
  });
});
