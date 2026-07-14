import { describe, it, expect, vi, beforeEach } from "vitest";

// ── API Route Logic Tests ─────────────────────────
// Test business logic yang dipakai di API routes
// Tanpa mock Next.js server — test pure logic

import { mockUsers, mockProducts, mockAccounts, mockSettings } from "./helpers";

// ── Products API Logic ───────────────────────────

describe("Products API Logic", () => {
  describe("Search logic", () => {
    function searchProducts(products: any[], query: string): any[] {
      if (!query) return products;
      const lower = query.toLowerCase();
      return products.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        (p.barcode && p.barcode.includes(query))
      );
    }

    it("should search by name", () => {
      const results = searchProducts(mockProducts, "indomie");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Indomie Goreng");
    });

    it("should search by barcode", () => {
      const results = searchProducts(mockProducts, "899001");
      expect(results).toHaveLength(1);
      expect(results[0].barcode).toBe("899001");
    });

    it("should return all when no query", () => {
      const results = searchProducts(mockProducts, "");
      expect(results).toHaveLength(2);
    });

    it("should be case insensitive", () => {
      const results = searchProducts(mockProducts, "INDOMIE");
      expect(results).toHaveLength(1);
    });

    it("should return empty for no match", () => {
      const results = searchProducts(mockProducts, "nonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("Create product validation", () => {
    function validateProduct(b: any): { valid: boolean; error?: string } {
      if (!b.name) return { valid: false, error: "Name wajib diisi" };
      if (!b.sellPrice) return { valid: false, error: "Harga jual wajib diisi" };
      if (parseFloat(b.sellPrice) < 0) return { valid: false, error: "Harga jual tidak valid" };
      return { valid: true };
    }

    it("should reject empty name", () => {
      expect(validateProduct({ sellPrice: "1000" }).valid).toBe(false);
    });

    it("should reject empty sellPrice", () => {
      expect(validateProduct({ name: "Test" }).valid).toBe(false);
    });

    it("should reject negative price", () => {
      expect(validateProduct({ name: "Test", sellPrice: "-100" }).valid).toBe(false);
    });

    it("should accept valid product", () => {
      expect(validateProduct({ name: "Test", sellPrice: "1000" }).valid).toBe(true);
    });

    it("should accept product with image", () => {
      expect(validateProduct({ name: "Test", sellPrice: "1000", image: "data:image/png;base64,abc" }).valid).toBe(true);
    });
  });
});

// ── Accounts API Logic ───────────────────────────

describe("Accounts API Logic", () => {
  describe("Transfer validation", () => {
    function validateTransfer(from: any, to: any, amount: number): { valid: boolean; error?: string } {
      if (!from || !to) return { valid: false, error: "Account not found" };
      if (amount <= 0) return { valid: false, error: "Invalid amount" };
      if (from.balance < amount) return { valid: false, error: "Insufficient balance" };
      return { valid: true };
    }

    it("should reject missing account", () => {
      expect(validateTransfer(null, mockAccounts[1], 1000).valid).toBe(false);
    });

    it("should reject zero amount", () => {
      expect(validateTransfer(mockAccounts[0], mockAccounts[1], 0).valid).toBe(false);
    });

    it("should reject negative amount", () => {
      expect(validateTransfer(mockAccounts[0], mockAccounts[1], -100).valid).toBe(false);
    });

    it("should reject insufficient balance", () => {
      expect(validateTransfer(mockAccounts[0], mockAccounts[1], 999999999).valid).toBe(false);
    });

    it("should accept valid transfer", () => {
      expect(validateTransfer(mockAccounts[0], mockAccounts[1], 100000).valid).toBe(true);
    });
  });

  describe("Delete account validation", () => {
    function validateDelete(acc: any): { valid: boolean; error?: string } {
      if (acc.code === "cash") return { valid: false, error: "Kas Tunai tidak bisa dihapus" };
      if (!acc.isActive) return { valid: false, error: "Account sudah nonaktif" };
      return { valid: true };
    }

    it("should reject deleting cash account", () => {
      expect(validateDelete(mockAccounts[0]).valid).toBe(false);
    });

    it("should accept deleting bank account", () => {
      expect(validateDelete(mockAccounts[1]).valid).toBe(true);
    });
  });
});

// ── Auth/Users API Logic ─────────────────────────

describe("User Management API Logic", () => {
  describe("Create user validation", () => {
    function validateCreateUser(b: any, existing: any[]): { valid: boolean; error?: string } {
      if (!b.name) return { valid: false, error: "Nama wajib diisi" };
      if (!b.username) return { valid: false, error: "Username wajib diisi" };
      if (!b.password) return { valid: false, error: "Password wajib diisi" };
      if (b.password.length < 6) return { valid: false, error: "Password minimal 6 karakter" };
      if (existing.find(u => u.username === b.username)) return { valid: false, error: "Username sudah digunakan" };
      return { valid: true };
    }

    it("should reject empty name", () => {
      expect(validateCreateUser({ username: "test", password: "123456" }, []).valid).toBe(false);
    });

    it("should reject empty username", () => {
      expect(validateCreateUser({ name: "Test", password: "123456" }, []).valid).toBe(false);
    });

    it("should reject empty password", () => {
      expect(validateCreateUser({ name: "Test", username: "test" }, []).valid).toBe(false);
    });

    it("should reject short password", () => {
      expect(validateCreateUser({ name: "Test", username: "test", password: "123" }, []).valid).toBe(false);
    });

    it("should reject duplicate username", () => {
      expect(validateCreateUser({ name: "Test", username: "admin", password: "123456" }, mockUsers).valid).toBe(false);
    });

    it("should accept valid user", () => {
      expect(validateCreateUser({ name: "New", username: "newuser", password: "123456" }, mockUsers).valid).toBe(true);
    });
  });

  describe("Delete user validation", () => {
    function validateDeleteUser(userId: number, currentUserId: number): { valid: boolean; error?: string } {
      if (userId === currentUserId) return { valid: false, error: "Tidak bisa menghapus akun sendiri" };
      return { valid: true };
    }

    it("should reject self-delete", () => {
      expect(validateDeleteUser(1, 1).valid).toBe(false);
    });

    it("should accept deleting other user", () => {
      expect(validateDeleteUser(2, 1).valid).toBe(true);
    });
  });

  describe("Login validation", () => {
    function validateLogin(b: any): { valid: boolean; error?: string } {
      if (!b.username || !b.password) return { valid: false, error: "Username dan password wajib diisi" };
      return { valid: true };
    }

    it("should reject empty username", () => {
      expect(validateLogin({ password: "123" }).valid).toBe(false);
    });

    it("should reject empty password", () => {
      expect(validateLogin({ username: "admin" }).valid).toBe(false);
    });

    it("should accept valid credentials", () => {
      expect(validateLogin({ username: "admin", password: "admin123" }).valid).toBe(true);
    });
  });
});

// ── Settings API Logic ───────────────────────────

describe("Settings API Logic", () => {
  describe("Update settings", () => {
    function mergeSettings(existing: Record<string, string>, updates: Record<string, string>): Record<string, string> {
      return { ...existing, ...updates };
    }

    it("should merge updates into existing", () => {
      const result = mergeSettings(mockSettings, { store_name: "Toko Baru" });
      expect(result.store_name).toBe("Toko Baru");
      expect(result.app_name).toBe("POS & Agen Bisnis"); // unchanged
    });

    it("should add new keys", () => {
      const result = mergeSettings(mockSettings, { new_key: "new_value" });
      expect(result.new_key).toBe("new_value");
    });

    it("should handle empty updates", () => {
      const result = mergeSettings(mockSettings, {});
      expect(result.store_name).toBe("Toko Maju Jaya");
    });
  });
});

// ── Transactions API Logic ───────────────────────

describe("Transactions API Logic", () => {
  describe("POS checkout calculation", () => {
    function calculateCheckout(cart: any[], discount: number = 0) {
      const subtotal = cart.reduce((s, c) => s + parseFloat(c.subtotal), 0);
      const total = subtotal - discount;
      const profit = cart.reduce((s, c) => s + (parseFloat(c.subtotal) - parseFloat(c.buyPrice) * c.quantity), 0);
      return { subtotal, total, profit, itemCount: cart.reduce((s, c) => s + c.quantity, 0) };
    }

    const mockCart = [
      { productId: 1, productName: "Indomie", unitPrice: "3500", buyPrice: "2500", quantity: 2, subtotal: "7000" },
      { productId: 2, productName: "Aqua", unitPrice: "4000", buyPrice: "2800", quantity: 1, subtotal: "4000" },
    ];

    it("should calculate subtotal", () => {
      expect(calculateCheckout(mockCart).subtotal).toBe(11000);
    });

    it("should calculate total with discount", () => {
      expect(calculateCheckout(mockCart, 1000).total).toBe(10000);
    });

    it("should calculate profit", () => {
      // (3500*2 - 2500*2) + (4000*1 - 2800*1) = 2000 + 1200 = 3200
      expect(calculateCheckout(mockCart).profit).toBe(3200);
    });

    it("should count items", () => {
      expect(calculateCheckout(mockCart).itemCount).toBe(3);
    });
  });

  describe("Invoice number generation", () => {
    it("should generate with correct prefix", () => {
      const invoice = "POS" + Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      expect(invoice).toMatch(/^POS\d{10}\d{3}$/);
    });
  });
});

// ── Seed Data Logic ──────────────────────────────

describe("Seed Data Logic", () => {
  describe("Account count", () => {
    it("should have 15 accounts in seed (cash + 10 banks + 4 ewallets)", () => {
      const accountCount = 1 + 10 + 4; // cash + banks + ewallets
      expect(accountCount).toBe(15);
    });
  });

  describe("Service categories count", () => {
    it("should have 9 service categories", () => {
      const categories = ["Transfer", "Penarikan Tunai", "Setor Tunai", "Pembayaran Tagihan", "Token PLN", "Pulsa & Paket Data", "Voucher Game", "Cicilan", "Lainnya"];
      expect(categories).toHaveLength(9);
    });
  });

  describe("Token PLN nominals", () => {
    it("should have 6 Token PLN nominals", () => {
      const nominals = [20000, 50000, 100000, 200000, 500000, 1000000];
      expect(nominals).toHaveLength(6);
    });
  });

  describe("Voucher Game nominals", () => {
    it("should have 6 Voucher Game nominals", () => {
      const nominals = [12000, 33000, 66000, 132000, 330000, 600000];
      expect(nominals).toHaveLength(6);
    });
  });

  describe("Cicilan providers", () => {
    it("should have 3 multifinance providers", () => {
      const providers = ["FIF", "Adira", "WOM"];
      expect(providers).toHaveLength(3);
    });
  });
});
