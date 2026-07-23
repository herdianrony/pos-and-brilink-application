import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  ShoppingCart,
  Landmark,
  TrendingUp,
  Eye,
  Ban,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TransactionItemRow, TransactionRow } from "../api";
import { formatRupiah, paymentLabel } from "../lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Tabs,
  Spinner,
  StatCard,
  Modal,
  Input,
  Field,
} from "../components/ui";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const typeTabs: Array<{ id: string; label: string; icon?: LucideIcon }> = [
  { id: "all", label: "Semua", icon: ClipboardList },
  { id: "pos", label: "POS", icon: ShoppingCart },
  { id: "agent", label: "Layanan Agen", icon: Landmark },
];

const statusOptions = [
  { id: "all", label: "Semua Status" },
  { id: "completed", label: "Selesai" },
  { id: "pending", label: "Pending" },
  { id: "void", label: "Batal" },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "completed") return "success";
  if (status === "pending") return "warning";
  if (status === "void" || status === "reversed") return "danger";
  return "default";
}

function statusLabel(status: string) {
  if (status === "completed") return "Selesai";
  if (status === "pending") return "Pending";
  if (status === "void") return "Batal";
  if (status === "reversed") return "Reverse";
  return status;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HistoryPage({
  transactions,
  selectedTransaction,
  selectedTransactionItems,
  onOpenDetail,
  onTransactionAction,
  saving,
}: {
  transactions: TransactionRow[];
  selectedTransaction: TransactionRow | null;
  selectedTransactionItems: TransactionItemRow[];
  onOpenDetail: (transaction: TransactionRow) => void;
  onTransactionAction: (id: number, action: "void" | "reverse" | "complete", reason: string) => Promise<void>;
  saving: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    transaction: TransactionRow | null;
    action: "void" | "reverse" | "complete" | null;
    reason: string;
  }>({ open: false, transaction: null, action: null, reason: "" });

  // Open modal whenever selectedTransaction is set by parent
  useEffect(() => {
    setModalOpen(!!selectedTransaction);
  }, [selectedTransaction]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const typeOk = typeFilter === "all" || t.transaction_type === typeFilter;
      const statusOk = statusFilter === "all" || t.status === statusFilter;
      return typeOk && statusOk;
    });
  }, [transactions, typeFilter, statusFilter]);

  const revenue = filtered.reduce((s, t) => s + t.total_amount, 0);
  const profit = filtered.reduce((s, t) => s + t.profit, 0);
  const pendingCount = transactions.filter((t) => t.status === "pending").length;

  function openActionDialog(transaction: TransactionRow, action: "void" | "reverse" | "complete") {
    setActionDialog({ open: true, transaction, action, reason: "" });
  }

  function closeActionDialog() {
    setActionDialog({ open: false, transaction: null, action: null, reason: "" });
  }

  async function handleActionSubmit() {
    if (!actionDialog.transaction || !actionDialog.action || !actionDialog.reason.trim()) return;
    try {
      await onTransactionAction(actionDialog.transaction.id, actionDialog.action, actionDialog.reason.trim());
      closeActionDialog();
    } catch {
      // Error handled by parent
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <PageHeader
        eyebrow="Riwayat"
        title="Riwayat Transaksi"
        description={`${filtered.length} transaksi ditemukan${pendingCount > 0 ? ` • ${pendingCount} pending` : ""}`}
      />

      {/* 2. Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<ShoppingCart size={18} />}
          label="Total"
          value={String(filtered.length)}
          sub="transaksi"
          color="bg-emerald-50 text-emerald-500"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Pendapatan"
          value={formatRupiah(revenue)}
          color="bg-emerald-50 text-emerald-500"
        />
        <StatCard
          icon={<Landmark size={18} />}
          label="Keuntungan"
          value={formatRupiah(profit)}
          color="bg-amber-50 text-amber-500"
        />
      </div>

      {/* 3. Type tabs */}
      <Tabs
        items={typeTabs}
        active={typeFilter}
        onChange={setTypeFilter}
        ariaLabel="Filter tipe transaksi"
      />

      {/* 4. Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusOptions.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === s.id
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 5. Transaction table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Transaksi akan muncul setelah kasir atau layanan agen digunakan."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Riwayat Transaksi</caption>
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <th className="text-left p-3 font-medium">Invoice</th>
                  <th className="text-left p-3 font-medium">Tipe</th>
                  <th className="text-left p-3 font-medium">Pelanggan</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-right p-3 font-medium">Profit</th>
                  <th className="text-left p-3 font-medium">Waktu</th>
                  <th className="text-center p-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`border-t transition-colors cursor-pointer ${
                      transaction.status === "pending"
                        ? "border-amber-100 bg-amber-50/30 hover:bg-amber-50/60"
                        : transaction.status === "completed"
                          ? "border-slate-50 hover:bg-emerald-50/30"
                          : "border-red-100 bg-red-50/20 text-slate-500 hover:bg-red-50/40"
                    }`}
                    onClick={() => onOpenDetail(transaction)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onOpenDetail(transaction);
                    }}
                    tabIndex={0}
                  >
                    <td className="p-3 font-mono text-xs text-slate-500">
                      {transaction.invoice_no}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          transaction.transaction_type === "pos"
                            ? "primary"
                            : "purple"
                        }
                      >
                        {transaction.transaction_type === "pos"
                          ? "POS"
                          : "Layanan Agen"}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500 text-xs">
                      {transaction.customer_name || "-"}
                    </td>
                    <td className="p-3">
                      <Badge variant={statusVariant(transaction.status)}>
                        {transaction.status === "pending" ? "\u26a0 " : ""}
                        {statusLabel(transaction.status)}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatRupiah(transaction.total_amount)}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600">
                      {formatRupiah(transaction.profit)}
                    </td>
                    <td className="p-3 text-slate-500 text-xs whitespace-nowrap">
                      {transaction.created_at}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Lihat detail"
                          onClick={() => onOpenDetail(transaction)}
                        >
                          <Eye size={14} />
                        </button>
                        {transaction.status === "pending" && (
                          <>
                            <button
                              className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Batalkan (Void)"
                              onClick={() => openActionDialog(transaction, "void")}
                            >
                              <Ban size={14} />
                            </button>
                            <button
                              className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Selesaikan"
                              onClick={() => openActionDialog(transaction, "complete")}
                            >
                              <CheckCircle size={14} />
                            </button>
                          </>
                        )}
                        {transaction.status === "completed" && (
                          <button
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Reverse Transaksi"
                            onClick={() => openActionDialog(transaction, "reverse")}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 6. Transaction detail modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="md"
      >
        {selectedTransaction && (
          <div className="p-5 space-y-4">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedTransaction.transaction_type === "pos"
                      ? "bg-emerald-100"
                      : "bg-purple-100"
                  }`}
                >
                  {selectedTransaction.transaction_type === "pos" ? (
                    <ShoppingCart size={20} className="text-emerald-600" />
                  ) : (
                    <Landmark size={20} className="text-purple-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Detail Transaksi
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedTransaction.invoice_no}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(selectedTransaction.status)}>
                  {statusLabel(selectedTransaction.status)}
                </Badge>
              </div>
            </div>

            {/* Info grid */}
            <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Tanggal</span>
                <span className="font-medium text-slate-700">
                  {selectedTransaction.created_at}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tipe</span>
                <span className="font-medium text-slate-700">
                  {selectedTransaction.transaction_type === "pos"
                    ? "POS"
                    : "Layanan Agen"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pelanggan</span>
                <span className="font-medium text-slate-700">
                  {selectedTransaction.customer_name || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pembayaran</span>
                <span className="font-medium text-slate-700">
                  {paymentLabel(selectedTransaction.payment_method)}
                </span>
              </div>
            </div>

            {/* Items */}
            {selectedTransactionItems.length > 0 && (
              <div className="border-t border-dashed pt-3 space-y-2">
                <p className="text-sm font-bold text-slate-600">Item:</p>
                {selectedTransactionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm bg-slate-50 rounded-xl p-2.5"
                  >
                    <div>
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-slate-500 ml-1">
                        \u00d7 {item.quantity}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatRupiah(item.subtotal)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatRupiah(item.unit_price)} / pcs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {selectedTransaction.notes && (
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
                <span className="font-semibold">Catatan:</span>{" "}
                {selectedTransaction.notes}
              </div>
            )}

            {/* Summary */}
            <div className="border-t border-dashed pt-3 space-y-1">
              <div className="flex justify-between text-lg font-extrabold">
                <span>Total</span>
                <span className="text-emerald-700">
                  {formatRupiah(selectedTransaction.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Keuntungan</span>
                <span className="text-emerald-600 font-bold">
                  {formatRupiah(selectedTransaction.profit)}
                </span>
              </div>
            </div>

            {/* Action buttons in detail modal */}
            <div className="flex gap-2 border-t border-dashed pt-3">
              {selectedTransaction.status === "pending" && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setModalOpen(false);
                      openActionDialog(selectedTransaction, "void");
                    }}
                  >
                    <Ban size={14} /> Void
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setModalOpen(false);
                      openActionDialog(selectedTransaction, "complete");
                    }}
                  >
                    <CheckCircle size={14} /> Selesaikan
                  </Button>
                </>
              )}
              {selectedTransaction.status === "completed" && (
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setModalOpen(false);
                    openActionDialog(selectedTransaction, "reverse");
                  }}
                >
                  <RotateCcw size={14} /> Reverse
                </Button>
              )}
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setModalOpen(false)}>
              Tutup
            </Button>
          </div>
        )}
      </Modal>

      {/* 7. Transaction Action Dialog (Void / Reverse / Complete) */}
      <Modal
        open={actionDialog.open}
        onClose={closeActionDialog}
        size="sm"
        eyebrow="Konfirmasi"
      >
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">
            {actionDialog.action === "void" && "Void Transaksi"}
            {actionDialog.action === "reverse" && "Reverse Transaksi"}
            {actionDialog.action === "complete" && "Selesaikan Transaksi"}
          </h3>
          <p className="text-sm text-slate-600">
            {actionDialog.action === "void" && "Membatalkan transaksi pending. Stok akan dikembalikan dan mutasi saldo dibalik."}
            {actionDialog.action === "reverse" && "Membalik transaksi yang sudah selesai. Stok akan dikembalikan dan mutasi saldo dibalik."}
            {actionDialog.action === "complete" && "Menyelesaikan transaksi yang masih pending."}
          </p>

          {actionDialog.transaction && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice</span>
                <span className="font-mono font-bold">{actionDialog.transaction.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-bold">{formatRupiah(actionDialog.transaction.total_amount)}</span>
              </div>
            </div>
          )}

          <Field label="Alasan">
            <Input
              placeholder="Alasan (minimal 3 karakter)"
              value={actionDialog.reason}
              onChange={(e) => setActionDialog((d) => ({ ...d, reason: e.target.value }))}
              autoFocus
            />
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={closeActionDialog}>
              Batal
            </Button>
            <Button
              variant={actionDialog.action === "complete" ? "primary" : "danger"}
              className="flex-1"
              disabled={saving || actionDialog.reason.trim().length < 3}
              onClick={handleActionSubmit}
            >
              {saving ? "Memproses..." : actionDialog.action === "void" ? "Void" : actionDialog.action === "reverse" ? "Reverse" : "Selesaikan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
