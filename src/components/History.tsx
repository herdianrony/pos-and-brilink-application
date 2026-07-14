"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Card, Badge, Button, Modal, Spinner, EmptyState, Tabs, StatCard } from "@/components/ui";
import { ClipboardList, Eye, X, TrendingUp, ShoppingCart, Landmark } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { useSettings } from "@/lib/use-settings";

interface Trx {
  id: number; invoiceNo: string; type: string; subType: string | null;
  customerName: string | null; customerPhone: string | null;
  totalAmount: string; adminFee: string | null; profit: string | null;
  paymentMethod: string | null; notes: string | null; createdAt: string;
}
interface TrxDetail extends Trx {
  items: Array<{ id: number; productName: string; quantity: number; unitPrice: string; subtotal: string }>;
}

export default function History() {
  const [trxs, setTrxs] = useState<Trx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<TrxDetail | null>(null);
  const [loadingDet, setLoadingDet] = useState(false);
  const { settings } = useSettings();
  const servicesLabel = settings.services_label || "Layanan Agen";

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter !== "all") p.set("type", filter);
    p.set("limit", "100");
    fetch(`/api/transactions?${p}`).then(r => r.json()).then(d => { setTrxs(d); setLoading(false); });
  }, [filter]);

  async function viewDetail(id: number) {
    setLoadingDet(true);
    const d = await (await fetch(`/api/transactions/${id}`)).json();
    setDetail(d); setLoadingDet(false);
  }

  const totalRev = trxs.reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  const totalProfit = trxs.reduce((s, t) => s + parseFloat(t.profit || "0"), 0);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <ClipboardList size={24} className="text-blue-500" /> Riwayat Transaksi
        </h2>
        <p className="text-sm text-slate-400">{trxs.length} transaksi ditemukan</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<ShoppingCart size={18} />} label="Total" value={trxs.length.toString()} sub="transaksi" color="bg-emerald-50 text-emerald-500" />
        <StatCard icon={<TrendingUp size={18} />} label="Pendapatan" value={formatRupiah(totalRev)} color="bg-emerald-50 text-emerald-500" />
        <StatCard icon={<Landmark size={18} />} label="Keuntungan" value={formatRupiah(totalProfit)} color="bg-amber-50 text-amber-500" />
      </div>

      <Tabs
        tabs={[
          { id: "all", label: "Semua" },
          { id: "pos", label: "POS", icon: "shopping-cart" },
          { id: "brilink", label: servicesLabel, icon: "landmark" },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <Card className="overflow-hidden">
        {loading ? <Spinner /> : trxs.length === 0 ? <EmptyState icon="clipboard-list" title="Belum ada transaksi" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="text-left p-3 font-medium">Invoice</th>
                <th className="text-left p-3 font-medium">Tipe</th>
                <th className="text-left p-3 font-medium">Detail</th>
                <th className="text-left p-3 font-medium">Pelanggan</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-right p-3 font-medium">Profit</th>
                <th className="text-left p-3 font-medium">Bayar</th>
                <th className="text-left p-3 font-medium">Waktu</th>
                <th className="text-center p-3 font-medium">Aksi</th>
              </tr></thead>
              <tbody>
                {trxs.map(t => (
                  <tr key={t.id} className="border-t border-slate-50 hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-slate-500">{t.invoiceNo}</td>
                    <td className="p-3"><Badge variant={t.type === "pos" ? "primary" : "purple"}>{t.type === "pos" ? "POS" : servicesLabel}</Badge></td>
                    <td className="p-3 text-slate-500 text-xs">{t.subType || "Penjualan"}</td>
                    <td className="p-3 text-slate-600">{t.customerName || "—"}</td>
                    <td className="p-3 text-right font-semibold">{formatRupiah(t.totalAmount)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatRupiah(t.profit || "0")}</td>
                    <td className="p-3 text-xs text-slate-500">{t.paymentMethod === "cash" ? "Tunai" : t.paymentMethod === "transfer" ? "Transfer" : "QRIS"}</td>
                    <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => viewDetail(t.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail || loadingDet} onClose={() => setDetail(null)}>
        {loadingDet ? <Spinner /> : detail && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">Detail Transaksi</h3>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="text-center bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400">Invoice</p>
              <p className="font-mono font-bold text-lg text-primary">{detail.invoiceNo}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDate(detail.createdAt)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">Tipe</span><p className="font-medium">{detail.type === "pos" ? "POS" : servicesLabel}</p></div>
              {detail.subType && <div><span className="text-slate-400">Layanan</span><p className="font-medium">{detail.subType}</p></div>}
              {detail.customerName && <div><span className="text-slate-400">Pelanggan</span><p className="font-medium">{detail.customerName}</p></div>}
              {detail.customerPhone && <div><span className="text-slate-400">No. HP/Rek</span><p className="font-medium">{detail.customerPhone}</p></div>}
              <div><span className="text-slate-400">Pembayaran</span><p className="font-medium capitalize">{detail.paymentMethod}</p></div>
            </div>
            {detail.items?.length > 0 && (
              <div className="border-t border-dashed pt-3 space-y-2">
                <p className="text-sm font-bold text-slate-600">Item:</p>
                {detail.items.map(i => (
                  <div key={i.id} className="flex justify-between text-sm bg-slate-50 rounded-xl p-2">
                    <span>{i.productName} <span className="text-slate-400">x{i.quantity}</span></span>
                    <span className="font-semibold">{formatRupiah(i.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-dashed pt-3 space-y-1">
              {detail.adminFee && parseFloat(detail.adminFee) > 0 && (
                <div className="flex justify-between text-sm"><span className="text-slate-400">Biaya Admin</span><span className="text-amber-600 font-semibold">{formatRupiah(detail.adminFee)}</span></div>
              )}
              <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="text-primary">{formatRupiah(detail.totalAmount)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Keuntungan</span><span className="text-emerald-600 font-bold">{formatRupiah(detail.profit || "0")}</span></div>
            </div>
            {detail.notes && <div className="bg-amber-50 rounded-xl p-3 text-sm">{detail.notes}</div>}
            <Button variant="primary" className="w-full" onClick={() => setDetail(null)}>Tutup</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
