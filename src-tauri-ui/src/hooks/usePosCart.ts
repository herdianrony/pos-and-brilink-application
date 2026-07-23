import { useMemo, useState } from "react";
import { checkoutPosCash } from "../api";
import type { ProductRow } from "../api";
import { formatRupiah } from "../lib/format";
import type { AgentCartItem, CartItem, ReceiptState } from "../types";

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
    () => cart.reduce((sum, item) => sum + (item.type === "product" ? item.product.sell_price * item.quantity : item.amount + item.fee), 0),
    [cart],
  );

  function addToCart(product: ProductRow) {
    if (product.stock <= 0) {
      onMessage(`Stok ${product.name} habis`);
      return;
    }
    setCart((items) => {
      const existing = items.find((item) => item.type === "product" && item.product.id === product.id);
      if (existing?.type === "product") {
        return items.map((item) => item.type === "product" && item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      }
      return [...items, { type: "product", product, quantity: 1 }];
    });
  }

  function addAgentService(service: Omit<AgentCartItem, "type" | "id">) {
    const serviceName = service.service_name.trim();
    if (!serviceName) {
      onMessage("Nama layanan wajib diisi");
      return;
    }
    if (service.amount < 0 || service.fee < 0 || service.provider_cost < 0) {
      onMessage("Nominal layanan, admin, dan biaya provider tidak boleh minus");
      return;
    }
    setCart((items) => [...items, { ...service, type: "agent", id: `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`, service_name: serviceName }]);
    onMessage(`Layanan ${serviceName} ditambahkan ke keranjang`);
  }

  function updateCartQty(productId: number, quantity: number) {
    setCart((items) => items.flatMap((item) => {
      if (item.type !== "product" || item.product.id !== productId) return [item];
      if (quantity <= 0) return [];
      return [{ ...item, quantity: Math.min(quantity, item.product.stock) }];
    }));
  }

  function removeCartItem(itemKey: string | number) {
    setCart((items) => items.filter((item) => item.type === "product" ? item.product.id !== itemKey : item.id !== itemKey));
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
    cashReceived,
  }: {
    saving: boolean;
    setSaving: (value: boolean) => void;
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
        items: cart.filter((item) => item.type === "product").map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        agent_items: cart.filter((item) => item.type === "agent").map((item) => ({
          service_name: item.service_name,
          customer_name: item.customer_name,
          amount: item.amount,
          fee: item.fee,
          provider_cost: item.provider_cost,
          account_id: item.account_id ?? null,
          cash_effect: item.cash_effect,
          bank_effect: item.bank_effect,
          notes: item.notes,
        })),
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
    addAgentService,
    updateCartQty,
    removeCartItem,
    clearCart,
    holdCart,
    submitCheckout,
  };
}
