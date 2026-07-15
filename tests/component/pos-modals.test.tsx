// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentModal from "@/components/pos/PaymentModal";
import DiscountModal from "@/components/pos/DiscountModal";
import HeldCartsModal from "@/components/pos/HeldCartsModal";
import type { HeldCart } from "@/lib/pos-cart";

const heldCart: HeldCart = {
  id: "1",
  customerName: "Budi",
  timestamp: new Date("2026-07-15T10:00:00+07:00").getTime(),
  cart: [
    { productId: 1, productName: "Produk A", unitPrice: "10000", buyPrice: "7000", quantity: 2, subtotal: "20000", stock: 10, unit: "pcs" },
  ],
};

describe("POS modals", () => {
  it("PaymentModal renders total and calls checkout", async () => {
    const onCheckout = vi.fn();
    render(
      <PaymentModal
        open
        customerName=""
        payMethod="cash"
        cashAmt="20000"
        paymentReference=""
        total={15000}
        grandTotal={15000}
        change={5000}
        submitting={false}
        onClose={() => {}}
        onCustomerNameChange={() => {}}
        onPayMethodChange={() => {}}
        onCashAmountChange={() => {}}
        onPaymentReferenceChange={() => {}}
        onCheckout={onCheckout}
      />
    );

    expect(screen.getByText("Pembayaran")).toBeInTheDocument();
    expect(screen.getByText(/Kembalian/i)).toBeInTheDocument();
    await userEvent.click(screen.getByText("Konfirmasi Bayar"));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it("PaymentModal disables checkout when cash is insufficient", () => {
    render(
      <PaymentModal
        open
        customerName=""
        payMethod="cash"
        cashAmt="5000"
        paymentReference=""
        total={15000}
        grandTotal={15000}
        change={-10000}
        submitting={false}
        onClose={() => {}}
        onCustomerNameChange={() => {}}
        onPayMethodChange={() => {}}
        onCashAmountChange={() => {}}
        onPaymentReferenceChange={() => {}}
        onCheckout={() => {}}
      />
    );

    expect(screen.getByText("Konfirmasi Bayar")).toBeDisabled();
  });

  it("DiscountModal requires a reason before applying discount", async () => {
    const onValidationError = vi.fn();
    render(
      <DiscountModal
        open
        discountType="rupiah"
        discountValue="5000"
        discountReason=""
        discountAdminPin=""
        discountAmount={5000}
        cartTotal={50000}
        onClose={() => {}}
        onDiscountTypeChange={() => {}}
        onDiscountValueChange={() => {}}
        onDiscountReasonChange={() => {}}
        onDiscountAdminPinChange={() => {}}
        onValidationError={onValidationError}
      />
    );

    await userEvent.click(screen.getByText("Terapkan"));
    expect(onValidationError).toHaveBeenCalledWith("Alasan diskon wajib diisi");
  });

  it("HeldCartsModal renders held carts and callbacks", async () => {
    const onResume = vi.fn();
    const onDelete = vi.fn();
    render(
      <HeldCartsModal
        open
        heldCarts={[heldCart]}
        onClose={() => {}}
        onResume={onResume}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText("Budi")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Lanjut"));
    expect(onResume).toHaveBeenCalledWith(heldCart);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onDelete).toHaveBeenCalledWith("1");
  });
});
