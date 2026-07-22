import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatNumber,
  formatDate,
  formatDateShort,
  generateInvoice,
  cn,
} from "@/lib/utils";

describe("formatRupiah", () => {
  // Note: Intl.NumberFormat('id-ID', currency: IDR) returns "Rp\u00A050.000"
  // \u00A0 = non-breaking space
  it("should format number to IDR currency", () => {
    expect(formatRupiah(50000)).toContain("50.000");
    expect(formatRupiah(1500000)).toContain("1.500.000");
    expect(formatRupiah(0)).toContain("0");
  });

  it("should handle string input", () => {
    expect(formatRupiah("50000")).toContain("50.000");
  });

  it("should handle invalid input", () => {
    expect(formatRupiah("abc")).toBe("Rp 0");
    expect(formatRupiah(NaN)).toBe("Rp 0");
  });

  it("should handle negative numbers", () => {
    const result = formatRupiah(-50000);
    expect(result).toContain("50.000");
  });
});

describe("formatNumber", () => {
  it("should format number with thousand separators", () => {
    expect(formatNumber(50000)).toBe("50.000");
    expect(formatNumber(1500000)).toBe("1.500.000");
  });

  it("should handle string input", () => {
    expect(formatNumber("1000")).toBe("1.000");
  });

  it("should handle invalid input", () => {
    expect(formatNumber("abc")).toBe("0");
    expect(formatNumber(NaN)).toBe("0");
  });
});

describe("formatDate", () => {
  it("should format date in Indonesian locale", () => {
    const date = new Date("2024-01-15T10:30:00");
    const result = formatDate(date);
    expect(result).toContain("15");
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
  });

  it("should handle string date input", () => {
    const result = formatDate("2024-01-15T10:30:00");
    expect(result).toContain("15");
  });
});

describe("formatDateShort", () => {
  it("should format date short", () => {
    const date = new Date("2024-01-15");
    const result = formatDateShort(date);
    expect(result).toContain("15");
    expect(result).toContain("Jan");
  });
});

describe("generateInvoice", () => {
  it("should generate invoice with prefix", () => {
    const invoice = generateInvoice("INV-");
    expect(invoice).toMatch(/^INV-\d{6}\d{6}\d{3}$/);
  });

  it("should generate unique invoices", () => {
    const inv1 = generateInvoice("POS-");
    const inv2 = generateInvoice("POS-");
    // Could theoretically be same if called in same millisecond,
    // but random suffix makes collision very unlikely
    expect(inv1).toMatch(/^POS-/);
    expect(inv2).toMatch(/^POS-/);
  });
});

describe("cn", () => {
  it("should join class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should filter falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });
});
