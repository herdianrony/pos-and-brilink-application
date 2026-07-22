import { useState, type FormEvent } from "react";
import { Landmark, CheckCircle, TrendingUp } from "lucide-react";
import type { AccountRow, TransactionRow } from "../api";
import type { AgentForm } from "../types";
import { CurrencyInput } from "../components/CurrencyInput";
import { Button, Card, EmptyState, Badge, Spinner, Input, Field } from "../components/ui";
import { formatRupiah } from "../lib/format";

/* ------------------------------------------------------------------ */
/*  Service presets                                                    */
/* ------------------------------------------------------------------ */

const servicePresets: Array<{
  key: "withdraw" | "deposit" | "transfer" | "payment";
  name: string;
  description: string;
  fee: string;
  group: string;
}> = [
  { key: "withdraw", name: "Tarik Tunai", description: "Pelanggan ambil uang tunai", fee: "Rp5.000", group: "Tunai" },
  { key: "deposit", name: "Setor Tunai", description: "Setor ke rekening / e-wallet", fee: "Rp5.000", group: "Tunai" },
  { key: "transfer", name: "Transfer", description: "Transfer bank / provider", fee: "Rp5.000", group: "Transfer" },
  { key: "payment", name: "Payment / Topup", description: "Token, pulsa, tagihan", fee: "Rp2.500", group: "Payment" },
];

/* ------------------------------------------------------------------ */
/*  Step indicator — 3 circles connected by lines                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Input", "Review", "Konfirmasi"] as const;
  return (
    <div className="flex items-center justify-center py-3">
      {([1, 2, 3] as const).map((num, i) => (
        <div key={num} className="flex items-center">
          {i > 0 && (
            <div
              className={`h-0.5 w-14 mx-1.5 rounded-full transition-colors duration-300 ${
                current > num - 1 ? "bg-primary/50" : "bg-slate-200"
              }`}
            />
          )}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                current === num
                  ? "gradient-primary text-white shadow-glow-primary scale-110"
                  : current > num
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {current > num ? <CheckCircle size={18} /> : num}
            </div>
            <span
              className={`text-[11px] font-semibold whitespace-nowrap transition-colors ${
                current === num ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {labels[i]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review row helper                                                  */
/* ------------------------------------------------------------------ */

function ReviewRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="text-sm text-slate-500 font-semibold">{label}</span>
      <span className={`text-sm font-bold ${valueClass ?? "text-slate-900"}`}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function AgentServicesPage({
  accounts,
  transactions,
  agentForm,
  agentStep,
  saving,
  onAgentFormChange,
  onAgentStepChange,
  onApplyPreset,
  onSubmitAgentTransaction,
}: {
  accounts: AccountRow[];
  transactions: TransactionRow[];
  agentForm: AgentForm;
  agentStep: 1 | 2 | 3;
  saving: boolean;
  onAgentFormChange: (form: AgentForm) => void;
  onAgentStepChange: (step: 1 | 2 | 3) => void;
  onApplyPreset: (kind: "withdraw" | "deposit" | "transfer" | "payment") => void;
  onSubmitAgentTransaction: (event: FormEvent) => void;
}) {
  const [search, setSearch] = useState("");

  /* derived values */
  const filteredServices = servicePresets.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCustomerPay = Number(agentForm.amount || 0) + Number(agentForm.fee || 0);
  const agentProfit = Number(agentForm.fee || 0) - Number(agentForm.provider_cost || 0);
  const selectedAccount = accounts.find((a) => String(a.id) === agentForm.account_id);

  /* ---------------------------------------------------------------- */
  /*  STEP 1 — Input                                                   */
  /* ---------------------------------------------------------------- */
  if (agentStep === 1) {
    return (
      <div className="space-y-5 animate-fadeIn max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Landmark size={24} className="text-purple-500" /> Layanan Agen
          </h2>
          <p className="text-sm text-slate-400">Pilih layanan dan catat transaksi nasabah</p>
        </div>

        <StepIndicator current={1} />

        <div className="space-y-5">
          {/* ── Service search ── */}
          <Input
            placeholder="Cari layanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="wizard-input"
          />

          {/* ── Service grid ── */}
          {filteredServices.length === 0 ? (
            <EmptyState title="Layanan tidak ditemukan" description="Coba kata kunci lain." compact />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredServices.map((service) => {
                const isSelected = agentForm.service_name === service.name;
                return (
                  <button
                    key={service.key}
                    type="button"
                    onClick={() => {
                      onApplyPreset(service.key);
                      onAgentStepChange(1);
                    }}
                    className={`relative grid min-h-[120px] content-center justify-items-center gap-1.5 rounded-2xl border-2 p-4 text-center transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-[0_8px_22px_rgba(4,120,87,.12)]"
                        : "border-transparent bg-white text-slate-900 shadow-[0_4px_14px_rgba(15,23,42,.04)] hover:border-teal-300 hover:bg-teal-50"
                    }`}
                  >
                    <span
                      className={`inline-grid h-10 w-10 place-items-center rounded-xl text-white ${
                        isSelected ? "bg-gradient-to-br from-emerald-700 to-teal-500" : "bg-slate-200"
                      }`}
                    >
                      <Landmark size={20} />
                    </span>
                    <strong className="text-sm">{service.name}</strong>
                    <small className="text-xs font-semibold text-slate-500">{service.description}</small>
                    <Badge variant={isSelected ? "primary" : "default"}>{service.fee}</Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Form fields ── */}
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama Pelanggan">
                <Input
                  placeholder="Nama nasabah"
                  value={agentForm.customer_name}
                  onChange={(e) => onAgentFormChange({ ...agentForm, customer_name: e.target.value })}
                  className="wizard-input"
                />
              </Field>

              <Field label="Nominal Transaksi" note="Nilai uang transfer / pulsa / token">
                <CurrencyInput
                  value={agentForm.amount}
                  onChange={(v) => onAgentFormChange({ ...agentForm, amount: v })}
                  placeholder="Rp0"
                />
              </Field>

              <Field label="Admin Toko" note="Biaya admin yang dibayar pelanggan">
                <CurrencyInput
                  value={agentForm.fee}
                  onChange={(v) => onAgentFormChange({ ...agentForm, fee: v })}
                  placeholder="Rp0"
                />
              </Field>

              <Field label="Potongan Bank/Provider" note="Keuntungan = Admin Toko − Potongan">
                <CurrencyInput
                  value={agentForm.provider_cost}
                  onChange={(v) => onAgentFormChange({ ...agentForm, provider_cost: v })}
                  placeholder="Rp0"
                />
              </Field>
            </div>

            {/* Account & effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Rekening Layanan">
                <select
                  className="wizard-input w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer"
                  value={agentForm.account_id}
                  onChange={(e) => onAgentFormChange({ ...agentForm, account_id: e.target.value })}
                >
                  <option value="">Tidak ada perubahan rekening</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Perubahan Saldo Rekening" note="Contoh transfer keluar: -100000">
                <CurrencyInput
                  allowNegative
                  value={agentForm.bank_effect}
                  onChange={(v) => onAgentFormChange({ ...agentForm, bank_effect: v })}
                  placeholder="Rp0"
                />
              </Field>

              <Field label="Perubahan Kas Tunai" note="Contoh pelanggan bayar tunai: 105000">
                <CurrencyInput
                  allowNegative
                  value={agentForm.cash_effect}
                  onChange={(v) => onAgentFormChange({ ...agentForm, cash_effect: v })}
                  placeholder="Rp0"
                />
              </Field>

              <Field label="Catatan">
                <Input
                  placeholder="Catatan tambahan..."
                  value={agentForm.notes}
                  onChange={(e) => onAgentFormChange({ ...agentForm, notes: e.target.value })}
                  className="wizard-input"
                />
              </Field>
            </div>

            {/* Quick summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Total Bayar Pelanggan</span>
                <strong className="text-lg font-black text-slate-950">{formatRupiah(totalCustomerPay)}</strong>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <span className="block text-xs font-black uppercase tracking-wide text-emerald-500">Estimasi Keuntungan</span>
                <strong className="text-lg font-black text-emerald-700">{formatRupiah(agentProfit)}</strong>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={() => onAgentStepChange(2)}>
                Lanjut ke Review
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  STEP 2 — Review                                                  */
  /* ---------------------------------------------------------------- */
  if (agentStep === 2) {
    return (
      <div className="space-y-5 animate-fadeIn max-w-2xl mx-auto">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Landmark size={24} className="text-purple-500" /> Layanan Agen
          </h2>
          <p className="text-sm text-slate-400">Pilih layanan dan catat transaksi nasabah</p>
        </div>

        <StepIndicator current={2} />

        <div className="space-y-4">
          {/* Service badge */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-700 to-teal-500 text-white">
                  <Landmark size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">{agentForm.service_name || "—"}</h3>
                  <p className="text-xs text-slate-400">Review detail transaksi</p>
                </div>
              </div>
              <Badge variant="primary">{servicePresets.find((s) => s.name === agentForm.service_name)?.fee ?? "—"}</Badge>
            </div>

            <div className="space-y-0">
              <ReviewRow label="Pelanggan" value={agentForm.customer_name || "—"} />
              <ReviewRow label="Nominal Transaksi" value={formatRupiah(Number(agentForm.amount || 0))} />
              <ReviewRow label="Admin Toko" value={formatRupiah(Number(agentForm.fee || 0))} />
              <ReviewRow label="Potongan Bank/Provider" value={formatRupiah(Number(agentForm.provider_cost || 0))} />
              <ReviewRow label="Keuntungan Jasa" value={formatRupiah(agentProfit)} valueClass="text-emerald-600" />
              <ReviewRow label="Total Bayar Pelanggan" value={formatRupiah(totalCustomerPay)} valueClass="text-slate-900" />
              {selectedAccount && (
                <ReviewRow label="Rekening" value={selectedAccount.name} />
              )}
              {agentForm.bank_effect && agentForm.bank_effect !== "0" && (
                <ReviewRow
                  label="Perubahan Rekening"
                  value={formatRupiah(Number(agentForm.bank_effect))}
                  valueClass={Number(agentForm.bank_effect) >= 0 ? "text-emerald-600" : "text-red-600"}
                />
              )}
              {agentForm.cash_effect && agentForm.cash_effect !== "0" && (
                <ReviewRow
                  label="Perubahan Kas"
                  value={formatRupiah(Number(agentForm.cash_effect))}
                  valueClass={Number(agentForm.cash_effect) >= 0 ? "text-emerald-600" : "text-red-600"}
                />
              )}
              {agentForm.notes && <ReviewRow label="Catatan" value={agentForm.notes} />}
            </div>
          </Card>

          {/* Profit highlight */}
          {agentProfit > 0 && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">Estimasi keuntungan agen</span>
              </div>
              <span className="text-xl font-extrabold text-emerald-700">+{formatRupiah(agentProfit)}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => onAgentStepChange(1)}>
              Kembali
            </Button>
            <Button size="lg" className="flex-1" onClick={() => onAgentStepChange(3)}>
              Konfirmasi Transaksi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  STEP 3 — Confirm / Processing                                    */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-5 animate-fadeIn max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Landmark size={24} className="text-purple-500" /> Layanan Agen
        </h2>
        <p className="text-sm text-slate-400">Pilih layanan dan catat transaksi nasabah</p>
      </div>

      <StepIndicator current={3} />

      <div className="space-y-5">
        {saving ? (
          /* ── Processing state ── */
          <Card className="p-10 text-center space-y-4">
            <Spinner size="lg" />
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">Memproses transaksi...</h3>
              <p className="text-sm text-slate-400 mt-1">Mohon tunggu, transaksi sedang dicatat.</p>
            </div>
          </Card>
        ) : (
          /* ── Confirmation state ── */
          <>
            <Card className="p-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={28} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Konfirmasi Transaksi</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Pastikan data berikut sudah benar sebelum menyimpan.
                </p>
              </div>
            </Card>

            {/* Quick recap */}
            <Card className="p-4">
              <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan</span>
                  <span className="font-bold">{agentForm.service_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nominal</span>
                  <span className="font-bold">{formatRupiah(Number(agentForm.amount || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bayar</span>
                  <span className="font-bold">{formatRupiah(totalCustomerPay)}</span>
                </div>
                {agentProfit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Keuntungan</span>
                    <span className="font-bold text-emerald-600">+{formatRupiah(agentProfit)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => onAgentStepChange(2)}>
                Kembali
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={(e) => onSubmitAgentTransaction(e)}
              >
                Konfirmasi Transaksi
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}