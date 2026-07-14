"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Card, Badge, Button, Modal, Spinner, EmptyState, Tabs, StatCard, Input, useToast } from "@/components/ui";
import { ClipboardList, Eye, X, TrendingUp, ShoppingCart, Landmark, CheckCircle, Ban, RotateCcw, AlertTriangle, Printer, Banknote, Building2, Receipt } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ReceiptPreview, type ReceiptData } from "@/components/ReceiptPreview";
import { useSettings } from "@/lib/use-settings";

interface Trx {
  id: number; invoiceNo: string; type: string; subType: string | null;
  customerName: string | null; customerPhone: string | null;
  totalAmount: string; adminFee: string | null; profit: string | null;
  paymentMethod: string | null; notes: string | null; createdAt: string;
  status?: string | null;
  referenceNo?: string | null;
  flowType?: string | null;
  feeMethod?: string | null;
  cashReceived?: string | null;
  cashDispensed?: string | null;
  settlementAccountId?: number | null;
  confirmedAt?: string | null;
  confirmedByUserId?: number | null;
}
interface TrxDetail extends Trx {
  items: Array<{ id: number; productName: string; quantity: number; unitPrice: string; subtotal: string }>;
  denominations?: Array<{ id: number; denomination: number; count: number; subtotal: number }>;
}

// P2: Status badge config
const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" | "primary" | "purple" }> = {
  completed: { label: "Selesai", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  void: { label: "Dibatalkan", variant: "danger" },
  reversed: { label: "Di-reverse", variant: "danger" },
  draft: { label: "Draft", variant: "primary" },
};

export default function History() {
  const [trxs, setTrxs] = useState<Trx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<TrxDetail | null>(null);
  const [loadingDet, setLoadingDet] = useState(false);
  const { settings } = useSettings();
  const servicesLabel = settings.services_label || "Layanan Agen";
  const toast = useToast();

  // P2: Lifecycle action state
  const [actionModal, setActionModal] = useState<{
    type: "complete" | "void" | "reverse";
    trx: Trx | null;
  } | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

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

  // P2: Filter by status (client-side)
  const filteredTrxs = statusFilter === "all"
    ? trxs
    : trxs.filter(t => (t.status || "completed") === statusFilter);

  // P2: Lifecycle actions
  function openAction(type: "complete" | "void" | "reverse", trx: Trx) {
    setActionModal({ type, trx });
    setActionInput("");
  }

  async function submitAction() {
    if (!actionModal?.trx) return;
    setActionSubmitting(true);
    try {
      const body: Record<string, unknown> = { action: actionModal.type };
      if (actionModal.type === "complete") {
        body.referenceNo = actionInput;
      } else {
        body.reason = actionInput;
      }

      const res = await fetch(`/api/transactions/${actionModal.trx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal memproses aksi");
        return;
      }
      toast.success(actionModal.type === "complete" ? "Transaksi diselesaikan" : actionModal.type === "void" ? "Transaksi dibatalkan" : "Transaksi di-reverse");
      setActionModal(null);

      // Refresh list + detail
      const p = new URLSearchParams();
      if (filter !== "all") p.set("type", filter);
      p.set("limit", "100");
      const newTrxs = await (await fetch(`/api/transactions?${p}`)).json();
      setTrxs(newTrxs);
      if (detail?.id === actionModal.trx.id) {
        const d = await (await fetch(`/api/transactions/${detail.id}`)).json();
        setDetail(d);
      }
    } catch {
      toast.error("Gagal memproses aksi");
    } finally {
      setActionSubmitting(false);
    }
  }

  const totalRev = filteredTrxs.filter(t => t.status !== "void" && t.status !== "reversed").reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  const totalProfit = filteredTrxs.filter(t => t.status !== "void" && t.status !== "reversed").reduce((s, t) => s + parseFloat(t.profit || "0"), 0);
  const pendingCount = trxs.filter(t => t.status === "pending").length;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <ClipboardList size={24} className="text-blue-500" /> Riwayat Transaksi
        </h2>
        <p className="text-sm text-slate-400">{filteredTrxs.length} transaksi ditemukan{pendingCount > 0 && ` • ${pendingCount} pending`}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<ShoppingCart size={18} />} label="Total" value={filteredTrxs.length.toString()} sub="transaksi" color="bg-emerald-50 text-emerald-500" />
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

      {/* P2: Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "all", label: "Semua Status" },
          { id: "completed", label: "Selesai" },
          { id: "pending", label: "Pending" },
          { id: "void", label: "Dibatalkan" },
          { id: "reversed", label: "Di-reverse" },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === s.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? <Spinner /> : filteredTrxs.length === 0 ? <EmptyState icon="clipboard-list" title="Belum ada transaksi" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="text-left p-3 font-medium">Invoice</th>
                <th className="text-left p-3 font-medium">Tipe</th>
                <th className="text-left p-3 font-medium">Detail</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-right p-3 font-medium">Profit</th>
                <th className="text-left p-3 font-medium">Waktu</th>
                <th className="text-center p-3 font-medium">Aksi</th>
              </tr></thead>
              <tbody>
                {filteredTrxs.map(t => {
                  const status = t.status || "completed";
                  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.completed;
                  return (
                    <tr key={t.id} className="border-t border-slate-50 hover:bg-emerald-50/30 transition-colors">
                      <td className="p-3 font-mono text-xs text-slate-500">{t.invoiceNo}</td>
                      <td className="p-3"><Badge variant={t.type === "pos" ? "primary" : "purple"}>{t.type === "pos" ? "POS" : servicesLabel}</Badge></td>
                      <td className="p-3 text-slate-500 text-xs">{t.subType || "Penjualan"}</td>
                      <td className="p-3">
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        {t.referenceNo && <p className="text-[10px] text-slate-400 mt-0.5">Ref: {t.referenceNo}</p>}
                      </td>
                      <td className="p-3 text-right font-semibold">{formatRupiah(t.totalAmount)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{formatRupiah(t.profit || "0")}</td>
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => viewDetail(t.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl" title="Lihat detail"><Eye size={14} /></button>
                        {/* P2: Lifecycle action buttons */}
                        {status === "pending" && (
                          <>
                            <button onClick={() => openAction("complete", t)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl" title="Tandai selesai"><CheckCircle size={14} /></button>
                            <button onClick={() => openAction("void", t)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl" title="Batalkan"><Ban size={14} /></button>
                          </>
                        )}
                        {status === "completed" && t.type === "brilink" && (
                          <button onClick={() => openAction("reverse", t)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-xl" title="Reverse"><RotateCcw size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail || loadingDet} onClose={() => setDetail(null)} size="md">
        {loadingDet ? <Spinner /> : detail && (
          <div className="p-5 space-y-4">
            {/* Header with status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${detail.type === "pos" ? "bg-emerald-100" : "bg-purple-100"}`}>
                  {detail.type === "pos" ? <ShoppingCart size={20} className="text-emerald-600" /> : <Landmark size={20} className="text-purple-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Detail Transaksi</h3>
                  <p className="text-xs text-slate-400 font-mono">{detail.invoiceNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detail.status && (
                  <Badge variant={(STATUS_CONFIG[detail.status]?.variant) || "primary"}>
                    {STATUS_CONFIG[detail.status]?.label || detail.status}
                  </Badge>
                )}
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
            </div>

            {/* Invoice info — compact row */}
            <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Tanggal</span>
                <span className="font-medium text-slate-700">{formatDate(detail.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tipe</span>
                <span className="font-medium text-slate-700">{detail.type === "pos" ? "POS" : servicesLabel}</span>
              </div>
              {detail.subType && (
                <div>
                  <span className="text-slate-400 block">Layanan</span>
                  <span className="font-medium text-slate-700">{detail.subType}</span>
                </div>
              )}
              {detail.flowType && (
                <div>
                  <span className="text-slate-400 block">Flow</span>
                  <span className="font-medium text-slate-700 capitalize">{detail.flowType.replace(/_/g, " ")}</span>
                </div>
              )}
              {detail.customerName && (
                <div>
                  <span className="text-slate-400 block">Pelanggan</span>
                  <span className="font-medium text-slate-700">{detail.customerName}</span>
                </div>
              )}
              {detail.customerPhone && (
                <div>
                  <span className="text-slate-400 block">No. HP/Rek</span>
                  <span className="font-medium text-slate-700">{detail.customerPhone}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block">Pembayaran</span>
                <span className="font-medium text-slate-700 capitalize">{detail.paymentMethod}</span>
              </div>
              {detail.referenceNo && (
                <div>
                  <span className="text-slate-400 block">No. Referensi</span>
                  <span className="font-medium text-slate-700 font-mono">{detail.referenceNo}</span>
                </div>
              )}
              {detail.feeMethod && detail.feeMethod !== "cash" && (
                <div>
                  <span className="text-slate-400 block">Metode Fee</span>
                  <span className="font-medium text-slate-700 capitalize">{detail.feeMethod}</span>
                </div>
              )}
              {detail.confirmedAt && (
                <div>
                  <span className="text-slate-400 block">Dikonfirmasi</span>
                  <span className="font-medium text-slate-700">{formatDate(detail.confirmedAt)}</span>
                </div>
              )}
            </div>

            {/* Items */}
            {detail.items?.length > 0 && (
              <div className="border-t border-dashed pt-3 space-y-2">
                <p className="text-sm font-bold text-slate-600">Item:</p>
                {detail.items.map(i => (
                  <div key={i.id} className="flex justify-between text-sm bg-slate-50 rounded-xl p-2.5">
                    <div>
                      <span className="font-medium">{i.productName}</span>
                      <span className="text-slate-400 ml-1">× {i.quantity}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatRupiah(i.subtotal)}</div>
                      <div className="text-[10px] text-slate-400">{formatRupiah(i.unitPrice)} / pcs</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Denominations */}
            {detail.denominations && detail.denominations.length > 0 && (
              <div className="border-t border-dashed pt-3 space-y-2">
                <p className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Banknote size={14} /> Denominasi Uang:</p>
                <div className="grid grid-cols-2 gap-2">
                  {detail.denominations.map(d => (
                    <div key={d.id} className="text-xs bg-slate-50 rounded-xl p-2 flex justify-between">
                      <span>{formatRupiah(d.denomination)} × {d.count}</span>
                      <span className="font-semibold">{formatRupiah(d.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cash flow summary */}
            {(detail.cashReceived || detail.cashDispensed) && (
              <div className="border-t border-dashed pt-3 space-y-1">
                <p className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Receipt size={14} /> Arus Kas:</p>
                {detail.cashReceived && parseFloat(detail.cashReceived) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1"><Banknote size={12} className="text-emerald-500" /> Kas Diterima</span>
                    <span className="font-semibold text-emerald-600">+{formatRupiah(detail.cashReceived)}</span>
                  </div>
                )}
                {detail.cashDispensed && parseFloat(detail.cashDispensed) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1"><Banknote size={12} className="text-red-500" /> Kas Dikeluarkan</span>
                    <span className="font-semibold text-red-600">-{formatRupiah(detail.cashDispensed)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="border-t border-dashed pt-3 space-y-1">
              {detail.adminFee && parseFloat(detail.adminFee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Biaya Admin</span>
                  <span className="text-amber-600 font-semibold">{formatRupiah(detail.adminFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-extrabold">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(detail.totalAmount)}</span>
              </div>
              {detail.profit && parseFloat(detail.profit) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Keuntungan</span>
                  <span className="text-emerald-600 font-bold">{formatRupiah(detail.profit)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {detail.notes && (
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
                <span className="font-semibold">Catatan:</span> {detail.notes}
              </div>
            )}

            {/* Print receipt button */}
            {detail.type === "pos" && detail.items?.length > 0 && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const receiptData: ReceiptData = {
                    store: { name: settings.app_name || "POS & Agen Bisnis", address: settings.store_address, phone: settings.phone },
                    invoice: {
                      no: detail.invoiceNo,
                      date: detail.createdAt,
                      type: detail.type.toUpperCase(),
                      cashier: "Admin",
                      customer: detail.customerName || undefined,
                    },
                    items: detail.items.map(i => ({ name: i.productName, qty: i.quantity, price: parseFloat(i.unitPrice), subtotal: parseFloat(i.subtotal) })),
                    summary: {
                      subtotal: parseFloat(detail.totalAmount) + (detail.adminFee ? parseFloat(detail.adminFee) : 0),
                      total: parseFloat(detail.totalAmount),
                      paymentMethod: detail.paymentMethod || "cash",
                    },
                  };
                  if (typeof window !== "undefined" && window.electronAPI) {
                    window.electronAPI.printer.print(receiptData);
                  } else {
                    window.print();
                  }
                }}
              >
                <Printer size={16} /> Cetak Ulang Struk
              </Button>
            )}

            {/* Lifecycle actions */}
            {detail.status === "pending" && (
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => openAction("void", detail)}>
                  <Ban size={14} /> Batalkan
                </Button>
                <Button variant="primary" className="flex-1" onClick={() => openAction("complete", detail)}>
                  <CheckCircle size={14} /> Tandai Selesai
                </Button>
              </div>
            )}
            {detail.status === "completed" && detail.type === "brilink" && (
              <Button variant="secondary" className="w-full" onClick={() => openAction("reverse", detail)}>
                <RotateCcw size={14} /> Reverse Transaksi
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => setDetail(null)}>Tutup</Button>
          </div>
        )}
      </Modal>

      {/* P2: Action modal (complete/void/reverse) */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} size="sm">
        {actionModal && actionModal.trx && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {actionModal.type === "complete" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={20} className="text-emerald-600" />
                </div>
              ) : actionModal.type === "void" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban size={20} className="text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <RotateCcw size={20} className="text-amber-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  {actionModal.type === "complete" ? "Tandai Selesai" : actionModal.type === "void" ? "Batalkan Transaksi" : "Reverse Transaksi"}
                </h3>
                <p className="text-xs text-slate-400">{actionModal.trx.invoiceNo}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Layanan</span><span className="font-medium">{actionModal.trx.subType || "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="font-bold">{formatRupiah(actionModal.trx.totalAmount)}</span></div>
            </div>

            {actionModal.type === "complete" ? (
              <Input
                label="No. Referensi Provider"
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder="Contoh: TRX12345678 dari M-Banking"
                autoFocus
              />
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Alasan {actionModal.type === "void" ? "Pembatalan" : "Reversal"}</label>
                <textarea
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  placeholder={actionModal.type === "void" ? "Contoh: Salah nominal dimasukkan" : "Contoh: Transfer gagal di provider"}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
                  rows={3}
                  autoFocus
                />
              </div>
            )}

            {actionModal.type === "reverse" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Reverse akan membuat counter-mutation untuk mengembalikan saldo. Saldo historis tidak diubah. Aksi ini hanya untuk admin.</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setActionModal(null)}>Batal</Button>
              <Button
                variant={actionModal.type === "complete" ? "primary" : "danger"}
                className="flex-1"
                onClick={submitAction}
                disabled={actionSubmitting || (actionModal.type === "complete" ? false : actionInput.trim().length < 3)}
              >
                {actionSubmitting ? "Memproses..." : actionModal.type === "complete" ? "Selesaikan" : actionModal.type === "void" ? "Batalkan" : "Reverse"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
