import { useState, type FormEvent } from "react";
import { Download, Receipt, Plus, Send, Banknote } from "lucide-react";
import type { DebtRow } from "../../api";
import { formatRupiah } from "../../lib/format";
import { Button, Card, EmptyState, Field, Input, Modal } from "../../components/ui";
import { StatCards, statusBadge } from "./helpers";

export function DebtsTab({
  debts,
  saving,
  onExportCsv,
  onAddDebt,
  onPayDebt,
  onCopyReminder,
}: {
  debts: DebtRow[];
  saving: boolean;
  onExportCsv: (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => void;
  onAddDebt: (form: { customer_name: string; phone: string; amount: string; notes: string }) => void;
  onPayDebt: (form: { debt_id: string; amount: string; notes: string }) => void;
  onCopyReminder: (debt: DebtRow) => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingDebt, setPayingDebt] = useState<DebtRow | null>(null);

  // Add debt form
  const [addForm, setAddForm] = useState({ customer_name: "", phone: "", amount: "0", notes: "" });

  // Pay debt form
  const [payForm, setPayForm] = useState({ debt_id: "", amount: "0", notes: "Cicilan utang" });

  function handleAddSubmit(e: FormEvent) {
    e.preventDefault();
    onAddDebt(addForm);
    if (!saving) {
      setShowAddModal(false);
      setAddForm({ customer_name: "", phone: "", amount: "0", notes: "" });
    }
  }

  function openPayModal(debt: DebtRow) {
    setPayingDebt(debt);
    setPayForm({ debt_id: String(debt.id), amount: "", notes: "Cicilan utang" });
    setShowPayModal(true);
  }

  function handlePaySubmit(e: FormEvent) {
    e.preventDefault();
    onPayDebt(payForm);
    if (!saving) {
      setShowPayModal(false);
      setPayingDebt(null);
    }
  }

  return (
    <div className="space-y-5" role="tabpanel" aria-label="Utang">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Receipt size={18} className="text-amber-500" /><h3 className="text-base font-extrabold text-slate-900">Ringkasan Utang</h3></div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onExportCsv("utang-catatagen.csv", debts.map((d) => ({ pelanggan: d.customer_name, phone: d.phone, total: d.amount, terbayar: d.paid_amount, sisa: d.outstanding, status: d.status, catatan: d.notes })))}><Download size={14} /> Unduh CSV</Button>
            <Button size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Tambah Utang</Button>
          </div>
        </div>
        <StatCards stats={[
          { label: "Total Utang", value: debts.length },
          { label: "Total Nominal", value: formatRupiah(debts.reduce((s, d) => s + d.amount, 0)) },
          { label: "Sudah Terbayar", value: formatRupiah(debts.reduce((s, d) => s + d.paid_amount, 0)) },
          { label: "Sisa Outstanding", value: formatRupiah(debts.reduce((s, d) => s + d.outstanding, 0)) },
        ]} />
        {debts.length === 0 ? <EmptyState compact title="Belum ada utang" description="Klik Tambah Utang untuk mencatat utang pelanggan." /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm text-left"><caption className="sr-only">Daftar Utang</caption>
              <thead><tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider"><th className="py-3 pr-4">Pelanggan</th><th className="py-3 pr-4">Telepon</th><th className="py-3 pr-4 text-right">Total</th><th className="py-3 pr-4 text-right">Terbayar</th><th className="py-3 pr-4 text-right">Sisa</th><th className="py-3 text-center">Status</th><th className="py-3 text-right">Aksi</th></tr></thead>
              <tbody>{debts.slice(0, 50).map((d) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4 font-bold text-slate-900">{d.customer_name}</td>
                  <td className="py-3 pr-4 text-slate-600">{d.phone || "—"}</td>
                  <td className="py-3 pr-4 text-right font-bold text-slate-900">{formatRupiah(d.amount)}</td>
                  <td className="py-3 pr-4 text-right text-emerald-600">{formatRupiah(d.paid_amount)}</td>
                  <td className="py-3 pr-4 text-right text-red-600 font-bold">{formatRupiah(d.outstanding)}</td>
                  <td className="py-3 text-center">{statusBadge(d.status)}</td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {d.status !== "lunas" && d.status !== "selesai" && (
                        <Button variant="secondary" size="sm" onClick={() => openPayModal(d)}><Banknote size={14} /> Bayar</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => onCopyReminder(d)} title="Salin pesan pengingat WhatsApp"><Send size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {debts.length > 50 && <p className="text-xs text-slate-500 text-center pt-3">Menampilkan 50 dari {debts.length} utang</p>}
          </div>
        )}
      </Card>

      {/* ── Add Debt Modal ── */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} size="sm" eyebrow="Utang">
        <div className="p-5">
          <h3 className="text-lg font-extrabold text-slate-900 mb-1">Tambah Utang Pelanggan</h3>
          <p className="text-sm text-slate-500 mb-4">Catat utang pelanggan yang belum dibayar.</p>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Pelanggan">
              <Input value={addForm.customer_name} onChange={(e) => setAddForm({ ...addForm, customer_name: e.target.value })} placeholder="Nama pelanggan" autoFocus />
            </Field>
            <Field label="Telepon">
              <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
            </Field>
            <Field label="Jumlah Utang">
              <Input type="text" inputMode="numeric" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value.replace(/\D/g, "") })} placeholder="0" />
            </Field>
            <Field label="Catatan">
              <Input value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Catatan tambahan" />
            </Field>
            <div className="flex gap-2 sm:col-span-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Batal</Button>
              <Button type="submit" disabled={saving || !addForm.customer_name || !Number(addForm.amount)}>{saving ? "Menyimpan..." : "Simpan Utang"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ── Pay Debt Modal ── */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} size="sm" eyebrow="Bayar Utang">
        <div className="p-5">
          <h3 className="text-lg font-extrabold text-slate-900 mb-1">Bayar Utang</h3>
          {payingDebt && (
            <p className="text-sm text-slate-500 mb-4">
              {payingDebt.customer_name} — Sisa: <span className="font-bold text-red-600">{formatRupiah(payingDebt.outstanding)}</span>
            </p>
          )}
          <form onSubmit={handlePaySubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jumlah Bayar">
              <Input type="text" inputMode="numeric" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value.replace(/\D/g, "") })} placeholder="0" autoFocus />
            </Field>
            <Field label="Catatan">
              <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Catatan pembayaran" />
            </Field>
            <div className="flex gap-2 sm:col-span-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowPayModal(false)}>Batal</Button>
              <Button type="submit" disabled={saving || !Number(payForm.amount)}>{saving ? "Memproses..." : "Bayar"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
