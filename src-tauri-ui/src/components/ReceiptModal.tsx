import { useEffect, useState } from "react";
import type { ReceiptState } from "../types";
import { formatRupiah, paymentLabel } from "../lib/format";
import { Button, CardHeader } from "./ui";
import { printThermalReceipt } from "../api";

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptState | null;
  onClose: () => void;
}) {
  const [printerHost, setPrinterHost] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printStatus, setPrintStatus] = useState("");

  useEffect(() => {
    if (!receipt) return;
    setPrinterHost(localStorage.getItem("catatagen.printer.host") || "");
    setPrinterPort(localStorage.getItem("catatagen.printer.port") || "9100");
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
        port: Number(printerPort || 9100),
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
      localStorage.setItem("catatagen.printer.port", printerPort.trim() || "9100");
      setPrintStatus("Struk berhasil dikirim ke printer thermal.");
    } catch (error) {
      setPrintStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="absolute inset-0 z-[80] grid min-h-[calc(100vh-64px)] place-items-center bg-slate-900/55 p-6 backdrop-blur print:bg-white print:p-0 print:backdrop-blur-none">
      <section className="max-h-[calc(100vh-48px)] w-[min(520px,100%)] overflow-auto rounded-[28px] bg-white p-5.5 shadow-[0_30px_90px_rgba(15,23,42,.35)] print:max-h-none print:w-auto print:overflow-visible print:rounded-none print:p-0 print:shadow-none" role="dialog" aria-modal="true" aria-label="Struk Penjualan">
        <CardHeader>
          <div><p className="m-0 mb-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Transaksi Berhasil</p><h2>Struk Penjualan</h2></div>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </CardHeader>
        <div className="mx-auto grid w-[min(360px,100%)] gap-2.5 rounded-[18px] border border-dashed border-slate-300 bg-white p-5 font-mono text-slate-900 print:w-[80mm] print:rounded-none print:border-0 print:p-[10mm] print:shadow-none print:block">
          <div className="grid justify-items-center gap-1 text-center [&_strong]:text-lg [&_span]:text-xs [&_span]:text-slate-500">
            <strong>CatatAgen Local</strong>
            <span>Struk POS Retail</span>
          </div>
          <div className="my-1 border-t border-dashed border-slate-300" />
          <div className="flex items-start justify-between gap-3.5 [&_span]:text-xs [&_span]:text-slate-500"><span>Invoice</span><strong>{currentReceipt.invoice_no}</strong></div>
          <div className="flex items-start justify-between gap-3.5 [&_span]:text-xs [&_span]:text-slate-500"><span>Waktu</span><strong>{currentReceipt.created_at}</strong></div>
          <div className="flex items-start justify-between gap-3.5 [&_span]:text-xs [&_span]:text-slate-500"><span>Bayar</span><strong>{paymentLabel(currentReceipt.payment_method)}</strong></div>
          <div className="my-1 border-t border-dashed border-slate-300" />
          {currentReceipt.items.map((item) => (
            <div key={item.type === "product" ? `product-${item.product.id}` : item.id} className="flex items-start justify-between gap-3.5 [&_div]:grid [&_div]:gap-1 [&_span]:text-xs [&_span]:text-slate-500">
              {item.type === "product" ? (
                <><div><strong>{item.product.name}</strong><span>{item.quantity} x {formatRupiah(item.product.sell_price)}</span></div><strong>{formatRupiah(item.quantity * item.product.sell_price)}</strong></>
              ) : (
                <><div><strong>{item.service_name}</strong><span>Layanan agen • admin {formatRupiah(item.fee)}</span></div><strong>{formatRupiah(item.amount + item.fee)}</strong></>
              )}
            </div>
          ))}
          <div className="my-1 border-t border-dashed border-slate-300" />
          <div className="flex items-start justify-between gap-3.5 text-lg"><span>Total</span><strong>{formatRupiah(currentReceipt.total_amount)}</strong></div>
          {currentReceipt.payment_method === "cash" && typeof currentReceipt.cash_received === "number" && (
            <>
              <div className="flex items-start justify-between gap-3.5 [&_span]:text-xs [&_span]:text-slate-500"><span>Tunai</span><strong>{formatRupiah(currentReceipt.cash_received)}</strong></div>
              <div className="flex items-start justify-between gap-3.5 [&_span]:text-xs [&_span]:text-slate-500"><span>Kembalian</span><strong>{formatRupiah(currentReceipt.change_amount || 0)}</strong></div>
            </>
          )}
          <div className="grid justify-items-center gap-1 text-center [&_strong]:text-lg [&_span]:text-xs [&_span]:text-slate-500 mt-2"><span>Terima kasih</span><span>Simpan struk ini sebagai bukti transaksi.</span></div>
        </div>
        <div className="mt-4 grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-2 max-[520px]:grid-cols-1">
            <label className="grid gap-2 text-[13px] font-black text-slate-600">IP Printer Thermal
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={printerHost} onChange={(event) => setPrinterHost(event.target.value)} placeholder="192.168.1.100" />
            </label>
            <label className="grid gap-2 text-[13px] font-black text-slate-600">Port
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={printerPort} onChange={(event) => setPrinterPort(event.target.value)} placeholder="9100" />
            </label>
          </div>
          {printStatus && <div className="mt-5 rounded-2xl bg-emerald-50 px-3.5 py-3 font-extrabold text-emerald-800">{printStatus}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden">
          <Button onClick={printThermal}>Print Thermal</Button>
          <Button variant="secondary" onClick={() => window.print()}>Print Sistem</Button>
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(`CatatAgen ${currentReceipt.invoice_no}\nTotal: ${formatRupiah(currentReceipt.total_amount)}\nBayar: ${paymentLabel(currentReceipt.payment_method)}`)}>Salin Ringkasan</Button>
        </div>
      </section>
    </div>
  );
}
