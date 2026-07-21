import type { ReceiptState } from "../types";
import { formatRupiah, paymentLabel } from "../lib/format";
import { Button, CardHeader } from "./ui";
import { tw } from "../lib/tw";

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptState | null;
  onClose: () => void;
}) {
  if (!receipt) return null;
  return (
    <div className={tw("modal-backdrop")}>
      <section className={tw("receipt-modal")}>
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
          <div className={tw("receipt-meta")}><span>Invoice</span><strong>{receipt.invoice_no}</strong></div>
          <div className={tw("receipt-meta")}><span>Waktu</span><strong>{receipt.created_at}</strong></div>
          <div className={tw("receipt-meta")}><span>Bayar</span><strong>{paymentLabel(receipt.payment_method)}</strong></div>
          <div className={tw("receipt-line")} />
          {receipt.items.map((item) => (
            <div key={item.product.id} className={tw("receipt-item")}>
              <div><strong>{item.product.name}</strong><span>{item.quantity} x {formatRupiah(item.product.sell_price)}</span></div>
              <strong>{formatRupiah(item.quantity * item.product.sell_price)}</strong>
            </div>
          ))}
          <div className={tw("receipt-line")} />
          <div className={tw("receipt-total")}><span>Total</span><strong>{formatRupiah(receipt.total_amount)}</strong></div>
          <div className={tw("receipt-center receipt-footer")}><span>Terima kasih</span><span>Simpan struk ini sebagai bukti transaksi.</span></div>
        </div>
        <div className={tw("modal-actions")}>
          <Button onClick={() => window.print()}>Print Struk</Button>
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(`CatatAgen ${receipt.invoice_no}\nTotal: ${formatRupiah(receipt.total_amount)}\nBayar: ${paymentLabel(receipt.payment_method)}`)}>Salin Ringkasan</Button>
        </div>
      </section>
    </div>
  );
}
