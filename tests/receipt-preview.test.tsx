// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ReceiptPreview, type ReceiptData } from "@/components/ReceiptPreview";
import { render, screen } from "@testing-library/react";

// ── ReceiptPreview Tests ──────────────────────────

const mockReceiptData: ReceiptData = {
  store: {
    name: "Toko Maju Jaya",
    address: "Jl. Raya No.123, Jakarta",
    phone: "081234567890",
    agentId: "AGT001",
  },
  invoice: {
    no: "POS240114123456",
    date: "2026-07-14T12:34:56",
    type: "POS",
    cashier: "Admin",
    customer: "Budi",
  },
  items: [
    { name: "Indomie Goreng", qty: 2, price: 3500, subtotal: 7000 },
    { name: "Aqua 600ml", qty: 1, price: 4000, subtotal: 4000 },
  ],
  summary: {
    subtotal: 11000,
    discount: 500,
    total: 10500,
    paymentMethod: "cash",
    paid: 15000,
    change: 4500,
  },
  footer: "Terima kasih",
};

describe("ReceiptPreview", () => {
  it("should render store name", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    expect(screen.getByText("Toko Maju Jaya")).toBeInTheDocument();
  });

  it("should render invoice number", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    expect(screen.getByText("POS240114123456")).toBeInTheDocument();
  });

  it("should render all items", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    expect(screen.getByText("Indomie Goreng")).toBeInTheDocument();
    expect(screen.getByText("Aqua 600ml")).toBeInTheDocument();
  });

  it("should render total", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    // Total = 10500
    const totalElements = screen.getAllByText(/10.500/i);
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it("should render discount when present", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    // Discount label should be present
    expect(screen.getByText("Diskon")).toBeInTheDocument();
  });

  it("should render change when cash payment", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    // Change = 4500
    expect(screen.getByText(/4.500/i)).toBeInTheDocument();
  });

  it("should render customer name when present", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    expect(screen.getByText("Budi")).toBeInTheDocument();
  });

  it("should render cashier name", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("should render footer text", () => {
    render(<ReceiptPreview data={mockReceiptData} />);
    // Footer "Terima kasih" appears in footer section
    const footerElements = screen.getAllByText("Terima kasih");
    expect(footerElements.length).toBeGreaterThan(0);
  });

  it("should handle empty items gracefully", () => {
    const emptyData: ReceiptData = {
      ...mockReceiptData,
      items: [],
    };
    render(<ReceiptPreview data={emptyData} />);
    expect(screen.getByText(/Tidak ada item/i)).toBeInTheDocument();
  });

  it("should handle missing optional fields", () => {
    const minimalData: ReceiptData = {
      store: { name: "Toko Saya" },
      invoice: { no: "INV001", date: "2026-07-14", type: "POS", cashier: "Kasir" },
      items: [{ name: "Item 1", qty: 1, price: 1000, subtotal: 1000 }],
      summary: { subtotal: 1000, total: 1000 },
    };
    render(<ReceiptPreview data={minimalData} />);
    expect(screen.getByText("Toko Saya")).toBeInTheDocument();
    expect(screen.getByText("INV001")).toBeInTheDocument();
    expect(screen.getByText("Kasir")).toBeInTheDocument();
  });

  it("should render with 58mm width", () => {
    const { container } = render(<ReceiptPreview data={mockReceiptData} width={58} />);
    expect(container.firstChild).toHaveClass("max-w-[230px]");
  });

  it("should render with 80mm width", () => {
    const { container } = render(<ReceiptPreview data={mockReceiptData} width={80} />);
    expect(container.firstChild).toHaveClass("max-w-[320px]");
  });

  it("should not render discount when 0 or undefined", () => {
    const noDiscountData: ReceiptData = {
      ...mockReceiptData,
      summary: { ...mockReceiptData.summary, discount: 0 },
    };
    render(<ReceiptPreview data={noDiscountData} />);
    // Should not have a "Diskon" label
    expect(screen.queryByText("Diskon")).not.toBeInTheDocument();
  });

  it("should not render change when 0 or undefined", () => {
    const noChangeData: ReceiptData = {
      ...mockReceiptData,
      summary: { ...mockReceiptData.summary, change: 0 },
    };
    render(<ReceiptPreview data={noChangeData} />);
    expect(screen.queryByText("Kembali")).not.toBeInTheDocument();
  });
});
