import { useEffect, useState } from "react";
import type { ReceiptState } from "../types";
import { formatRupiah, paymentLabel } from "../lib/format";
import { Button, CardHeader } from "./ui";
import { printThermalReceipt } from "../api";
import { tw } from "../lib/tw";

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptState | null;
  onClose: () => void;
}) {
  const [printerHost, setPrinterHost] = useState("");
  const [printStatus, setPrintStatus] = useState("");

  useEffect(() => {
    if (!receipt) return;
    setPrinterHost(localStorage.getItem("catatagen.printer.host") || "");
    setPrintStatus("");
  }, [receipt]);

  if (!receipt) return null;
  const currentReceipt = receipt;

  async function printThermal() {
    const host = printerHost.trim();
    if (!host) {
      setPrintStatus("Isi IP printer thermal terlebih dahulu.");
      return;
    }
    setPrintStatus("Mengirim struk ke printer...");
    try {
      await printThermalReceipt({
        host,
        port: 9100,
        invoice_no: currentReceipt.invoice_no,
        payment_method: paymentLabel(currentReceipt.payment_method),
        total_amount: currentReceipt.total_amount,
        cash_received: currentReceipt.cash_received,
        change_amount: currentReceipt.change_amount,
        items: currentReceipt.items.map((item) => item.type === "product"
          ? { name: item.product.name, quantity: item.quantity, unit_price: item.product.sell_price, subtotal: item.quantity * item.product.sell_price }
          : { name: item.service_name, quantity: 1, unit_price: item.amount + item.fee, subtotal: item.amount + item.fee }),
      });
      localStorage.setItem("catatagen.printer.host", host);
      setPrintStatus("Struk berhasil dikirim ke printer thermal.");
    } catch (error) {
      setPrintStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className={tw("modal-backdrop")}>
      <section className={tw("receipt-modal")} role="dialog" aria-modal="true" aria-label="Struk Penjualan">
        <CardHeader>
          <div><p className={tw("eyebrow")}>Transaksi Berhasil</p><h2>Struk Penjualan</h2></div>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </CardHeader>
        <div className={tw("receipt-paper printable-receipt")}>
          <div className={tw("receipt-center")}>
            <strong>CatatAgen Local</strong>
            <span>Struk POS Retail</span>
          </div>
          <div className={tw("receipt-line")} />
          <div className={tw("receipt-meta")}><span>Invoice</span><strong>{currentReceipt.invoice_no}</strong></div>
          <div className={tw("receipt-meta")}><span>Waktu</span><strong>{currentReceipt.created_at}</strong></div>
          <div className={tw("receipt-meta")}><span>Bayar</span><strong>{paymentLabel(currentReceipt.payment_method)}</strong></div>
          <div className={tw("receipt-line")} />
          {currentReceipt.items.map((item) => (
            <div key={item.type === "product" ? `product-${item.product.id}` : item.id} className={tw("receipt-item")}>
              {item.type === "product" ? (
                <><div><strong>{item.product.name}</strong><span>{item.quantity} x {formatRupiah(item.product.sell_price)}</span></div><strong>{formatRupiah(item.quantity * item.product.sell_price)}</strong></>
              ) : (
                <><div><strong>{item.service_name}</strong><span>Layanan agen • admin {formatRupiah(item.fee)}</span></div><strong>{formatRupiah(item.amount + item.fee)}</strong></>
              )}
            </div>
          ))}
          <div className={tw("receipt-line")} />
          <div className={tw("receipt-total")}><span>Total</span><strong>{formatRupiah(currentReceipt.total_amount)}</strong></div>
          {currentReceipt.payment_method === "cash" && typeof currentReceipt.cash_received === "number" && (
            <>
              <div className={tw("receipt-meta")}><span>Tunai</span><strong>{formatRupiah(currentReceipt.cash_received)}</strong></div>
              <div className={tw("receipt-meta")}><span>Kembalian</span><strong>{formatRupiah(currentReceipt.change_amount || 0)}</strong></div>
            </>
          )}
          <div className={tw("receipt-center receipt-footer")}><span>Terima kasih</span><span>Simpan struk ini sebagai bukti transaksi.</span></div>
        </div>
        <div className={tw("printer-panel")}>
          <label className={tw("field-label")}>IP Printer Thermal
            <input className={tw("form-input")} value={printerHost} onChange={(event) => setPrinterHost(event.target.value)} placeholder="192.168.1.100" />
          </label>
          {printStatus && <div className={tw("status-line")}>{printStatus}</div>}
        </div>
        <div className={tw("modal-actions")}>
          <Button onClick={printThermal}>Print Thermal</Button>
          <Button variant="secondary" onClick={() => window.print()}>Print Sistem</Button>
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(`CatatAgen ${currentReceipt.invoice_no}\nTotal: ${formatRupiah(currentReceipt.total_amount)}\nBayar: ${paymentLabel(currentReceipt.payment_method)}`)}>Salin Ringkasan</Button>
        </div>
      </section>
    </div>
  );
}
