import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle, HandCoins, MessageCircle, Plus, ReceiptText, WalletCards } from "lucide-react";
import type { DebtRow } from "../api";
import { CurrencyInput } from "../components/CurrencyInput";
import { Card, Button, ChipTabs, DataCell, DataCellText, DataRow, DataTable, EmptyState, Field, Input, Modal, PageHeader, StatCard } from "../components/ui";
import { formatRupiah } from "../lib/format";

type DebtFilter = "open" | "paid" | "all";

export function DebtsPage({
  debts,
  saving,
  onDebtFormChange,
  onDebtPaymentFormChange,
  onSubmitDebt,
  onSubmitDebtPayment,
  onCopyReminder,
}: {
  debts: DebtRow[];
  saving: boolean;
  onDebtFormChange: (form: { customer_name: string; phone: string; amount: string; notes: string }) => void;
  onDebtPaymentFormChange: (form: { debt_id: string; amount: string; notes: string }) => void;
  onSubmitDebt: (event: FormEvent) => void;
  onSubmitDebtPayment: (event: FormEvent) => void;
  onCopyReminder: (debt: DebtRow) => void;
}) {
  const [filter, setFilter] = useState<DebtFilter>("open");
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [debtForm, setDebtForm] = useState({ customer_name: "", phone: "", amount: "", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ debt_id: "", amount: "", notes: "" });

  const openDebts = debts.filter((debt) => debt.status !== "paid");
  const paidDebts = debts.filter((debt) => debt.status === "paid");
  const visibleDebts = useMemo(() => {
    if (filter === "open") return openDebts;
    if (filter === "paid") return paidDebts;
    return debts;
  }, [debts, filter, openDebts, paidDebts]);
  const totalOutstanding = openDebts.reduce((sum, debt) => sum + debt.outstanding, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.paid_amount, 0);

  function openAddDebt() {
    setDebtForm({ customer_name: "", phone: "", amount: "", notes: "" });
    setShowDebtModal(true);
  }

  function openPayment(debt: DebtRow) {
    setPaymentForm({ debt_id: String(debt.id), amount: "", notes: "" });
    setShowPaymentModal(true);
  }

  function handleSubmitDebt(e: FormEvent) {
    e.preventDefault();
    onDebtFormChange(debtForm);
    onSubmitDebt(e);
    if (!saving) setShowDebtModal(false);
  }

  function handleSubmitPayment(e: FormEvent) {
    e.preventDefault();
    onDebtPaymentFormChange(paymentForm);
    onSubmitDebtPayment(e);
    if (!saving) setShowPaymentModal(false);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Piutang Pelanggan"
        title="Buku Utang"
        description="Catat utang, cicilan, dan salin pengingat WhatsApp untuk pelanggan."
        actions={<Button onClick={openAddDebt}><Plus size={16} /> Tambah Utang</Button>}
      />

      <section className="grid grid-cols-3 gap-4 max-[720px]:grid-cols-1">
        <StatCard color="amber" icon={<ReceiptText size={20} />} label="Belum Lunas" value={formatRupiah(totalOutstanding)} sub={`${openDebts.length} pelanggan`} />
        <StatCard color="blue" icon={<WalletCards size={20} />} label="Total Utang" value={formatRupiah(totalDebt)} sub="semua catatan" />
        <StatCard color="green" icon={<CheckCircle size={20} />} label="Terbayar" value={formatRupiah(totalPaid)} sub={`${paidDebts.length} lunas`} />
      </section>

      <Card className="p-3">
        <ChipTabs
          ariaLabel="Filter utang"
          items={[
            { id: "open", label: "Belum Lunas" },
            { id: "paid", label: "Lunas" },
            { id: "all", label: "Semua" },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </Card>

      <Card className="p-5">
        {visibleDebts.length === 0 ? (
          <EmptyState title="Belum ada data utang" description="Klik Tambah Utang untuk mencatat utang pelanggan." />
        ) : (
          <DataTable columns={["Pelanggan", "Status", "Sisa", "Aksi"]} template="minmax(0,1.2fr) 110px 130px 104px" minWidth={640}>
            {visibleDebts.map((debt) => (
              <DataRow key={debt.id} template="minmax(0,1.2fr) 110px 130px 104px">
                <DataCell><strong>{debt.customer_name}</strong><DataCellText>{debt.phone || "Tanpa nomor"}</DataCellText><DataCellText>{debt.notes || "-"}</DataCellText></DataCell>
                <span className={debt.status === "paid" ? "inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-black bg-success-light/20 text-success" : "inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-black bg-amber-50 text-amber-700"}>{debt.status === "paid" ? "Lunas" : "Belum lunas"}</span>
                <div className="grid justify-items-end gap-1 text-right"><strong>{formatRupiah(debt.outstanding)}</strong><small>Total {formatRupiah(debt.amount)}</small></div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="secondary" className="h-10 w-10 p-0" title="Catat pembayaran" aria-label={`Catat pembayaran utang ${debt.customer_name}`} onClick={() => openPayment(debt)} disabled={debt.status === "paid"}><HandCoins size={16} /></Button>
                  <Button variant="secondary" className="h-10 w-10 p-0" title="Salin reminder" aria-label={`Salin reminder utang ${debt.customer_name}`} onClick={() => onCopyReminder(debt)} disabled={debt.status === "paid"}><MessageCircle size={16} /></Button>
                </div>
              </DataRow>
            ))}
          </DataTable>
        )}
      </Card>

      {/* ── Tambah Utang Modal ── */}
      <Modal open={showDebtModal} onClose={() => setShowDebtModal(false)} size="md" eyebrow="Utang Baru">
        <div className="p-6">
          <h3 className="text-lg font-extrabold text-slate-900 mb-5">Catat Utang Pelanggan</h3>
          <form onSubmit={handleSubmitDebt} className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            <Field label="Nama Pelanggan"><Input value={debtForm.customer_name} onChange={(e) => setDebtForm({ ...debtForm, customer_name: e.target.value })} placeholder="Nama pelanggan" autoFocus /></Field>
            <Field label="No WhatsApp"><Input value={debtForm.phone} onChange={(e) => setDebtForm({ ...debtForm, phone: e.target.value })} placeholder="628xxxx" /></Field>
            <Field label="Nominal Utang"><CurrencyInput value={debtForm.amount} onChange={(v) => setDebtForm({ ...debtForm, amount: v })} /></Field>
            <Field label="Catatan"><Input value={debtForm.notes} onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })} placeholder="Opsional" /></Field>
            <div className="flex gap-2 col-span-full justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowDebtModal(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Utang"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ── Catat Pembayaran Modal ── */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} size="md" eyebrow="Pembayaran Utang">
        <div className="p-6">
          <h3 className="text-lg font-extrabold text-slate-900 mb-5">Catat Pembayaran</h3>
          <form onSubmit={handleSubmitPayment} className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            <Field label="Pelanggan" className="col-span-full">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                value={paymentForm.debt_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, debt_id: e.target.value })}
              >
                <option value="">Pilih utang</option>
                {openDebts.map((d) => <option key={d.id} value={d.id}>{d.customer_name} — {formatRupiah(d.outstanding)}</option>)}
              </select>
            </Field>
            <Field label="Nominal Bayar"><CurrencyInput value={paymentForm.amount} onChange={(v) => setPaymentForm({ ...paymentForm, amount: v })} /></Field>
            <Field label="Catatan"><Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Opsional" /></Field>
            <div className="flex gap-2 col-span-full justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>Batal</Button>
              <Button type="submit" disabled={saving || !paymentForm.debt_id}>{saving ? "Menyimpan..." : "Simpan Pembayaran"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
