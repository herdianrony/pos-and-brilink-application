import { useState, type FormEvent } from "react";
import { Landmark, Star } from "lucide-react";
import type { AccountRow, TransactionRow } from "../api";
import type { AgentForm } from "../types";
import { CurrencyInput } from "../components/CurrencyInput";
import { Button, Card, CardHeader, ChipTabs, EmptyState, PageHeader, SectionCard } from "../components/ui";
import { formatRupiah } from "../lib/format";

type ServiceFilter = "Semua" | "Favorit" | "Tunai" | "Transfer" | "Payment";

const servicePresets: Array<{
  key: "withdraw" | "deposit" | "transfer" | "payment";
  code: string;
  name: string;
  description: string;
  fee: string;
  group: ServiceFilter;
  favorite?: boolean;
}> = [
  { key: "withdraw", code: "TT", name: "Tarik Tunai", description: "Pelanggan ambil uang tunai", fee: "Admin umum Rp5.000", group: "Tunai", favorite: true },
  { key: "deposit", code: "ST", name: "Setor Tunai", description: "Setor ke rekening/e-wallet", fee: "Admin umum Rp5.000", group: "Tunai" },
  { key: "transfer", code: "TR", name: "Transfer", description: "Transfer bank/provider", fee: "Admin umum Rp5.000", group: "Transfer", favorite: true },
  { key: "payment", code: "TP", name: "Payment/Topup", description: "Token, pulsa, tagihan", fee: "Admin mulai Rp2.500", group: "Payment" },
];

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
  agentStep: 1 | 2 | 3 | 4;
  saving: boolean;
  onAgentFormChange: (form: AgentForm) => void;
  onAgentStepChange: (step: 1 | 2 | 3 | 4) => void;
  onApplyPreset: (kind: "withdraw" | "deposit" | "transfer" | "payment") => void;
  onSubmitAgentTransaction: (event: FormEvent) => void;
}) {
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("Semua");
  const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
  const filteredServices = servicePresets.filter((service) => serviceFilter === "Semua" || (serviceFilter === "Favorit" ? service.favorite : service.group === serviceFilter));
  const totalCustomerPay = Number(agentForm.amount || 0) + Number(agentForm.fee || 0);
  const agentProfit = Number(agentForm.fee || 0) - Number(agentForm.provider_cost || 0);
  const selectedPreset = servicePresets.find((preset) => preset.name === agentForm.service_name);

  return (
    <>
      <PageHeader
        eyebrow="Pencatatan Layanan"
        title="Layanan Agen"
        description="Catat transaksi jasa agen tanpa koneksi API bank/provider."
        actions={<><Button variant="secondary" onClick={() => onAgentStepChange(1)}>Pilih Layanan</Button><Button onClick={() => onAgentStepChange(4)}>Review</Button></>}
      />

      <section className="grid grid-cols-[minmax(280px,.95fr)_minmax(420px,1.25fr)_minmax(300px,.8fr)] items-start gap-[18px] max-[1180px]:grid-cols-1">
        <SectionCard className="rounded-[28px]" title="Katalog Layanan" description="Pilih layanan yang paling sesuai dengan transaksi pelanggan.">
          <ChipTabs
            className="mb-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3"
            items={(["Semua", "Favorit", "Tunai", "Transfer", "Payment"] as ServiceFilter[]).map((filter) => ({ id: filter, label: filter }))}
            active={serviceFilter}
            onChange={setServiceFilter}
            ariaLabel="Filter layanan agen"
          />
          <div className="my-[10px] text-xs font-black uppercase tracking-[0.12em] text-slate-500">{serviceFilter === "Semua" ? "Semua Layanan" : `Layanan ${serviceFilter}`}</div>
          <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
            {filteredServices.map((service) => (
              <button key={service.key} type="button" className={agentForm.service_name === service.name ? "relative grid min-h-[150px] content-center justify-items-center gap-2 rounded-2xl border-2 border-transparent bg-white p-4 text-center text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,.05)] hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:shadow-[0_14px_32px_rgba(20,184,166,.12)] [&_small]:text-xs [&_small]:font-bold [&_small]:text-slate-500 [&_em]:rounded-full [&_em]:bg-amber-100 [&_em]:px-2 [&_em]:py-1 [&_em]:text-[11px] [&_em]:font-black [&_em]:not-italic [&_em]:text-amber-700 border-emerald-400 bg-emerald-50 text-emerald-800" : "relative grid min-h-[150px] content-center justify-items-center gap-2 rounded-2xl border-2 border-transparent bg-white p-4 text-center text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,.05)] hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:shadow-[0_14px_32px_rgba(20,184,166,.12)] [&_small]:text-xs [&_small]:font-bold [&_small]:text-slate-500 [&_em]:rounded-full [&_em]:bg-amber-100 [&_em]:px-2 [&_em]:py-1 [&_em]:text-[11px] [&_em]:font-black [&_em]:not-italic [&_em]:text-amber-700"} onClick={() => onApplyPreset(service.key)}>
                <span className="absolute right-2 top-2 text-amber-400"><Star size={13} /></span>
                <span className="inline-grid h-[42px] w-[42px] place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-500 text-white"><Landmark size={20} /></span>
                <strong>{service.name}</strong>
                <small>{service.description}</small>
                <em>{service.fee}</em>
              </button>
            ))}
          </div>
        </SectionCard>

        <Card className="rounded-[28px]">
          <div className="mb-4 flex items-start justify-between gap-3 rounded-3xl bg-slate-50 p-4 [&_p]:m-0 [&_p]:text-sm [&_p]:text-slate-500 [&>span]:rounded-full [&>span]:bg-emerald-100 [&>span]:px-3 [&>span]:py-1 [&>span]:text-xs [&>span]:font-black [&>span]:text-emerald-700">
            <div>
              <h2>{selectedPreset?.name || agentForm.service_name || "Pilih layanan"}</h2>
              <p>{selectedPreset?.description || "Pilih layanan dari katalog, lalu lengkapi nominal dan perubahan saldo."}</p>
            </div>
            <span>{agentStep}/4</span>
          </div>

          <div className="-mt-1 mb-4.5 grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1 grid-cols-4 max-[720px]:grid-cols-1 grid-cols-4 max-[720px]:grid-cols-1">
            <button className={agentStep === 1 ? "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600"} onClick={() => onAgentStepChange(1)}><span>1</span>Layanan</button>
            <button className={agentStep === 2 ? "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600"} onClick={() => onAgentStepChange(2)}><span>2</span>Nominal</button>
            <button className={agentStep === 3 ? "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600"} onClick={() => onAgentStepChange(3)}><span>3</span>Saldo</button>
            <button className={agentStep === 4 ? "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600 border-white/15 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_14px_28px_rgba(4,120,87,.26)]" : "flex items-center justify-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-700 shadow-sm [&_span]:inline-grid [&_span]:h-7 [&_span]:w-7 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:text-emerald-600"} onClick={() => onAgentStepChange(4)}><span>4</span>Simpan</button>
          </div>

          {agentStep === 1 && (
            <div className="grid gap-3.5">
              <div className="-mt-2 mb-4.5 flex flex-wrap items-center gap-2.5 rounded-[18px] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 px-4 py-3 text-[13px] font-extrabold text-emerald-800 [&_span]:font-bold [&_span]:text-slate-700"><strong>Langkah 1:</strong><span>Pilih kartu layanan di kiri atau ketik nama layanan manual.</span></div>
              <label className="grid gap-2 text-[13px] font-black text-slate-600">Nama Layanan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={agentForm.service_name} onChange={(event) => onAgentFormChange({ ...agentForm, service_name: event.target.value })} /></label>
              <div className="flex flex-wrap items-center justify-end gap-2.5"><Button onClick={() => onAgentStepChange(2)}>Lanjut Isi Nominal</Button></div>
            </div>
          )}

          {agentStep === 2 && (
            <div className="grid gap-3.5">
              <CardHeader><div><h2>Isi Nominal</h2><p>Pisahkan nominal transaksi dan admin toko agar keuntungan jasa jelas.</p></div></CardHeader>
              <div className="mb-5 grid grid-cols-2 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[640px]:grid-cols-1 [&_button]:col-span-full border-0 bg-transparent p-0">
                <label className="grid gap-2 text-[13px] font-black text-slate-600">Nama Pelanggan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={agentForm.customer_name} onChange={(event) => onAgentFormChange({ ...agentForm, customer_name: event.target.value })} /></label>
                <label className="grid gap-2 text-[13px] font-black text-slate-600">Nominal Transaksi<span className="-mt-0.5 block text-xs font-semibold leading-snug text-slate-500">Nilai uang transfer/pulsa/token.</span><CurrencyInput value={agentForm.amount} onChange={(value) => onAgentFormChange({ ...agentForm, amount: value })} /></label>
                <label className="grid gap-2 text-[13px] font-black text-slate-600">Admin Toko<span className="-mt-0.5 block text-xs font-semibold leading-snug text-slate-500">Biaya admin yang dibayar pelanggan.</span><CurrencyInput value={agentForm.fee} onChange={(value) => onAgentFormChange({ ...agentForm, fee: value })} /></label>
                <label className="grid gap-2 text-[13px] font-black text-slate-600">Potongan Bank/Provider<span className="-mt-0.5 block text-xs font-semibold leading-snug text-slate-500">Keuntungan = Admin Toko - Potongan.</span><CurrencyInput value={agentForm.provider_cost} onChange={(value) => onAgentFormChange({ ...agentForm, provider_cost: value })} /></label>
                <label className="grid gap-2 text-[13px] font-black text-slate-600 col-span-full md:col-span-2">Catatan<input className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={agentForm.notes} onChange={(event) => onAgentFormChange({ ...agentForm, notes: event.target.value })} /></label>
              </div>
              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1 [&_div]:rounded-2xl [&_div]:border [&_div]:border-slate-200 [&_div]:bg-slate-50 [&_div]:p-4 [&_span]:block [&_span]:text-xs [&_span]:font-black [&_span]:uppercase [&_span]:tracking-wide [&_span]:text-slate-400 [&_strong]:text-lg [&_strong]:font-black [&_strong]:text-slate-950">
                <div><span>Total Bayar Pelanggan</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
                <div><span>Estimasi Keuntungan</span><strong>{formatRupiah(agentProfit)}</strong></div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5"><Button variant="secondary" onClick={() => onAgentStepChange(1)}>Kembali</Button><Button onClick={() => onAgentStepChange(3)}>Lanjut Perubahan Saldo</Button></div>
            </div>
          )}

          {agentStep === 3 && (
            <div className="grid gap-3.5">
              <CardHeader><div><h2>Atur Perubahan Saldo</h2><p>Isi hanya saldo yang benar-benar berubah. Positif menambah, negatif mengurangi.</p></div></CardHeader>
              <div className="mb-5 grid grid-cols-2 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 max-[640px]:grid-cols-1 [&_button]:col-span-full border-0 bg-transparent p-0">
                <label className="grid gap-2 text-[13px] font-black text-slate-600">Rekening Layanan<select className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 transition-all duration-150 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" value={agentForm.account_id} onChange={(event) => onAgentFormChange({ ...agentForm, account_id: event.target.value })}>
                  <option value="">Tidak ada perubahan rekening</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select></label>
                <label className="grid gap-2 text-[13px] font-black text-slate-600">Perubahan Saldo Rekening<span className="-mt-0.5 block text-xs font-semibold leading-snug text-slate-500">Contoh transfer keluar: -100000</span><CurrencyInput allowNegative value={agentForm.bank_effect} onChange={(value) => onAgentFormChange({ ...agentForm, bank_effect: value })} /></label>
                <label className="grid gap-2 text-[13px] font-black text-slate-600">Perubahan Kas Tunai<span className="-mt-0.5 block text-xs font-semibold leading-snug text-slate-500">Contoh pelanggan bayar tunai: 105000</span><CurrencyInput allowNegative value={agentForm.cash_effect} onChange={(value) => onAgentFormChange({ ...agentForm, cash_effect: value })} /></label>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5"><Button variant="secondary" onClick={() => onAgentStepChange(2)}>Kembali</Button><Button onClick={() => onAgentStepChange(4)}>Review & Simpan</Button></div>
            </div>
          )}

          {agentStep === 4 && (
            <div className="grid gap-3.5">
              <CardHeader><div><h2>Review Transaksi</h2><p>Pastikan ringkasan sudah benar sebelum disimpan.</p></div></CardHeader>
              <div className="my-3.5 grid gap-2.5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 [&_div]:flex [&_div]:items-center [&_div]:justify-between [&_div]:gap-3 [&_div]:border-b [&_div]:border-slate-200 [&_div]:pb-2 [&_div:last-child]:border-b-0 [&_div:last-child]:pb-0 [&_span]:font-extrabold [&_span]:text-slate-500 bg-slate-50">
                <div><span>Layanan</span><strong>{agentForm.service_name || "-"}</strong></div>
                <div><span>Nominal</span><strong>{formatRupiah(Number(agentForm.amount || 0))}</strong></div>
                <div><span>Admin Toko</span><strong>{formatRupiah(Number(agentForm.fee || 0))}</strong></div>
                <div><span>Potongan Bank/Provider</span><strong>{formatRupiah(Number(agentForm.provider_cost || 0))}</strong></div>
                <div><span>Keuntungan Jasa</span><strong>{formatRupiah(agentProfit)}</strong></div>
                <div><span>Total Bayar</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
                <div><span>Perubahan Rekening</span><strong>{formatRupiah(Number(agentForm.bank_effect || 0))}</strong></div>
                <div><span>Perubahan Kas</span><strong>{formatRupiah(Number(agentForm.cash_effect || 0))}</strong></div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5"><Button variant="secondary" onClick={() => onAgentStepChange(3)}>Kembali</Button><Button onClick={(event) => onSubmitAgentTransaction(event as unknown as FormEvent)} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Transaksi Agen"}</Button></div>
            </div>
          )}
        </Card>

        <SectionCard className="rounded-[28px]" title="Riwayat Layanan" description="Transaksi layanan terbaru.">
          {agentTransactions.length === 0 ? <EmptyState title="Belum ada transaksi agen" description="Pilih layanan untuk mulai mencatat transaksi." /> : agentTransactions.slice(0, 8).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 [&_small]:mt-1 [&_small]:block">
              <div><strong>{transaction.notes || transaction.invoice_no}</strong><small>{transaction.invoice_no} • Untung {formatRupiah(transaction.profit)}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </SectionCard>
      </section>
    </>
  );
}
