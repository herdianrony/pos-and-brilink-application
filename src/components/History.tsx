"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Badge, Button, Modal, Spinner, Tabs, useToast } from "@/components/ui";
import {
  ClipboardList,
  X,
  ShoppingCart,
  Landmark,
  CheckCircle,
  Ban,
  RotateCcw,
  Printer,
  Banknote,
  Receipt,
} from "lucide-react";
import { type ReceiptData } from "@/components/ReceiptPreview";
import { useSettings } from "@/lib/use-settings";
import StatusFilter from "@/components/history/StatusFilter";
import HistoryStats from "@/components/history/HistoryStats";
import TransactionTable from "@/components/history/TransactionTable";
import LifecycleActionModal from "@/components/history/LifecycleActionModal";
import TransactionDetailModal from "@/components/history/TransactionDetailModal";
import POSReportPanel from "@/components/history/POSReportPanel";
import {
  calculateTransactionTotals,
  filterTransactionsByStatus,
  getStatusConfig,
} from "@/lib/history";
import type {
  TransactionActionState,
  TransactionActionType,
  Trx,
  TrxDetail,
} from "@/types/transactions";

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
  const [actionModal, setActionModal] = useState<TransactionActionState | null>(
    null,
  );
  const [actionInput, setActionInput] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter !== "all") p.set("type", filter);
    p.set("limit", "100");
    fetch(`/api/transactions?${p}`)
      .then((r) => r.json())
      .then((d) => {
        setTrxs(d);
        setLoading(false);
      });
  }, [filter]);

  async function viewDetail(id: number) {
    setLoadingDet(true);
    const d = await (await fetch(`/api/transactions/${id}`)).json();
    setDetail(d);
    setLoadingDet(false);
  }

  // P2: Filter by status (client-side)
  const filteredTrxs = filterTransactionsByStatus(trxs, statusFilter);

  // P2: Lifecycle actions
  function openAction(type: TransactionActionType, trx: Trx) {
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
      toast.success(
        actionModal.type === "complete"
          ? "Transaksi diselesaikan"
          : actionModal.type === "void"
            ? "Transaksi dibatalkan"
            : "Transaksi di-reverse",
      );
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

  const { revenue: totalRev, profit: totalProfit } =
    calculateTransactionTotals(filteredTrxs);
  const { pendingCount } = calculateTransactionTotals(trxs);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <ClipboardList size={24} className="text-blue-500" /> Riwayat
          Transaksi
        </h2>
        <p className="text-sm text-slate-400">
          {filteredTrxs.length} transaksi ditemukan
          {pendingCount > 0 && ` • ${pendingCount} pending`}
        </p>
      </div>

      <HistoryStats
        count={filteredTrxs.length}
        revenue={totalRev}
        profit={totalProfit}
      />

      <Tabs
        tabs={[
          { id: "all", label: "Semua" },
          { id: "pos", label: "POS", icon: "shopping-cart" },
          { id: "brilink", label: servicesLabel, icon: "landmark" },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <StatusFilter active={statusFilter} onChange={setStatusFilter} />

      {filter === "pos" && <POSReportPanel />}

      <TransactionTable
        loading={loading}
        transactions={filteredTrxs}
        servicesLabel={servicesLabel}
        onViewDetail={viewDetail}
        onOpenAction={openAction}
      />

      <TransactionDetailModal
        detail={detail}
        loadingDet={loadingDet}
        servicesLabel={servicesLabel}
        settings={settings}
        onClose={() => setDetail(null)}
        openAction={openAction}
      />

      <LifecycleActionModal
        action={actionModal}
        input={actionInput}
        submitting={actionSubmitting}
        onClose={() => setActionModal(null)}
        onInputChange={setActionInput}
        onSubmit={submitAction}
      />
    </div>
  );
}
