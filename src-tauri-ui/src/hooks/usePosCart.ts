import { useMemo, useState } from "react";
import { checkoutPosCash } from "../api";
import type { ProductRow } from "../api";
import { formatRupiah } from "../lib/format";
import type { CartItem, ReceiptState } from "../types";

export function usePosCart({
  onMessage,
  onRefresh,
}: {
  onMessage: (message: string) => void;
  onRefresh: () => Promise<unknown>;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastReceipt, setLastReceipt] = useState<ReceiptState | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris">("cash");
  const [settlementAccountId, setSettlementAccountId] = useState("");

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sell_price * item.quantity, 0),
    [cart],
  );

  function addToCart(product: ProductRow) {
    if (product.stock <= 0) {
      onMessage(`Stok ${product.name} habis`);
      return;
    }
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  function updateCartQty(productId: number, quantity: number) {
    setCart((items) => items.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      if (quantity <= 0) return [];
      return [{ ...item, quantity: Math.min(quantity, item.product.stock) }];
    }));
  }

  function clearCart() {
    setCart([]);
    onMessage("Keranjang dikosongkan");
  }

  function holdCart() {
    if (cart.length === 0) return;
    setCart([]);
    onMessage("Keranjang ditahan. Fitur daftar hold akan dilengkapi berikutnya.");
  }

  async function submitCheckout({
    saving,
    setSaving,
    resetStep,
    cashReceived,
  }: {
    saving: boolean;
    setSaving: (value: boolean) => void;
    resetStep: () => void;
    cashReceived?: number;
  }) {
    if (saving) return;
    setSaving(true);
    const receiptItems = cart.map((item) => ({ ...item }));
    const receiptPayment = paymentMethod;
    try {
      const result = await checkoutPosCash({
        payment_method: paymentMethod,
        settlement_account_id: paymentMethod === "cash" ? null : Number(settlementAccountId),
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      setLastReceipt({
        invoice_no: result.invoice_no,
        payment_method: receiptPayment,
        total_amount: result.total_amount,
        cash_received: receiptPayment === "cash" ? cashReceived : undefined,
        change_amount: receiptPayment === "cash" && typeof cashReceived === "number" ? Math.max(cashReceived - result.total_amount, 0) : undefined,
        created_at: new Date().toLocaleString("id-ID"),
        items: receiptItems,
      });
      setCart([]);
      resetStep();
      await onRefresh();
      onMessage(`Checkout berhasil: ${result.invoice_no} • ${formatRupiah(result.total_amount)}`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return {
    cart,
    cartTotal,
    lastReceipt,
    setLastReceipt,
    paymentMethod,
    setPaymentMethod,
    settlementAccountId,
    setSettlementAccountId,
    addToCart,
    updateCartQty,
    clearCart,
    holdCart,
    submitCheckout,
  };
}
