import { useState, type FormEvent } from "react";
import { Landmark, Star } from "lucide-react";
import type { AccountRow, TransactionRow } from "../api";
import type { AgentForm } from "../types";
import { CurrencyInput } from "../components/CurrencyInput";
import { Button, Card, CardHeader, EmptyState, PageHeader, SectionCard } from "../components/ui";
import { formatRupiah } from "../lib/format";
import { tw } from "../lib/tw";

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

      <section className={tw("electron-service-layout")}>
        <SectionCard className={tw("service-catalog-panel")} title="Katalog Layanan" description="Pilih layanan yang paling sesuai dengan transaksi pelanggan.">
          <div className={tw("service-filter-row")}>
            {(["Semua", "Favorit", "Tunai", "Transfer", "Payment"] as ServiceFilter[]).map((filter) => (
              <button key={filter} className={tw(serviceFilter === filter ? "filter-chip active" : "filter-chip")} onClick={() => setServiceFilter(filter)}>{filter}</button>
            ))}
          </div>
          <div className={tw("service-section-title")}>{serviceFilter === "Semua" ? "Semua Layanan" : `Layanan ${serviceFilter}`}</div>
          <div className={tw("electron-service-grid")}>
            {filteredServices.map((service) => (
              <button key={service.key} type="button" className={tw(agentForm.service_name === service.name ? "electron-service-card selected" : "electron-service-card")} onClick={() => onApplyPreset(service.key)}>
                <span className={tw("service-fav")}><Star size={13} /></span>
                <span className={tw("service-icon")}><Landmark size={20} /></span>
                <strong>{service.name}</strong>
                <small>{service.description}</small>
                <em>{service.fee}</em>
              </button>
            ))}
          </div>
        </SectionCard>

        <Card className={tw("service-form-panel")}>
          <div className={tw("service-progress-header")}>
            <div>
              <h2>{selectedPreset?.name || agentForm.service_name || "Pilih layanan"}</h2>
              <p>{selectedPreset?.description || "Pilih layanan dari katalog, lalu lengkapi nominal dan perubahan saldo."}</p>
            </div>
            <span>{agentStep}/4</span>
          </div>

          <div className={tw("stepper agent-stepper compact-agent-stepper")}>
            <button className={tw(agentStep === 1 ? "step active" : "step")} onClick={() => onAgentStepChange(1)}><span>1</span>Layanan</button>
            <button className={tw(agentStep === 2 ? "step active" : "step")} onClick={() => onAgentStepChange(2)}><span>2</span>Nominal</button>
            <button className={tw(agentStep === 3 ? "step active" : "step")} onClick={() => onAgentStepChange(3)}><span>3</span>Saldo</button>
            <button className={tw(agentStep === 4 ? "step active" : "step")} onClick={() => onAgentStepChange(4)}><span>4</span>Simpan</button>
          </div>

          {agentStep === 1 && (
            <div className={tw("workflow-content")}>
              <div className={tw("page-help")}><strong>Langkah 1:</strong><span>Pilih kartu layanan di kiri atau ketik nama layanan manual.</span></div>
              <label className={tw("field-label")}>Nama Layanan<input className={tw("form-input")} value={agentForm.service_name} onChange={(event) => onAgentFormChange({ ...agentForm, service_name: event.target.value })} /></label>
              <div className={tw("wizard-actions")}><Button onClick={() => onAgentStepChange(2)}>Lanjut Isi Nominal</Button></div>
            </div>
          )}

          {agentStep === 2 && (
            <div className={tw("workflow-content")}>
              <CardHeader><div><h2>Isi Nominal</h2><p>Pisahkan nominal transaksi dan admin toko agar keuntungan jasa jelas.</p></div></CardHeader>
              <div className={tw("product-form no-box")}>
                <label className={tw("field-label")}>Nama Pelanggan<input className={tw("form-input")} value={agentForm.customer_name} onChange={(event) => onAgentFormChange({ ...agentForm, customer_name: event.target.value })} /></label>
                <label className={tw("field-label")}>Nominal Transaksi<span className={tw("field-note")}>Nilai uang transfer/pulsa/token.</span><CurrencyInput value={agentForm.amount} onChange={(value) => onAgentFormChange({ ...agentForm, amount: value })} /></label>
                <label className={tw("field-label")}>Admin Toko<span className={tw("field-note")}>Biaya admin yang dibayar pelanggan.</span><CurrencyInput value={agentForm.fee} onChange={(value) => onAgentFormChange({ ...agentForm, fee: value })} /></label>
                <label className={tw("field-label")}>Potongan Bank/Provider<span className={tw("field-note")}>Keuntungan = Admin Toko - Potongan.</span><CurrencyInput value={agentForm.provider_cost} onChange={(value) => onAgentFormChange({ ...agentForm, provider_cost: value })} /></label>
                <label className={tw("field-label span-2")}>Catatan<input className={tw("form-input")} value={agentForm.notes} onChange={(event) => onAgentFormChange({ ...agentForm, notes: event.target.value })} /></label>
              </div>
              <div className={tw("agent-summary-grid")}>
                <div><span>Total Bayar Pelanggan</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
                <div><span>Estimasi Keuntungan</span><strong>{formatRupiah(agentProfit)}</strong></div>
              </div>
              <div className={tw("wizard-actions")}><Button variant="secondary" onClick={() => onAgentStepChange(1)}>Kembali</Button><Button onClick={() => onAgentStepChange(3)}>Lanjut Perubahan Saldo</Button></div>
            </div>
          )}

          {agentStep === 3 && (
            <div className={tw("workflow-content")}>
              <CardHeader><div><h2>Atur Perubahan Saldo</h2><p>Isi hanya saldo yang benar-benar berubah. Positif menambah, negatif mengurangi.</p></div></CardHeader>
              <div className={tw("product-form no-box")}>
                <label className={tw("field-label")}>Rekening Layanan<select className={tw("form-input")} value={agentForm.account_id} onChange={(event) => onAgentFormChange({ ...agentForm, account_id: event.target.value })}>
                  <option value="">Tidak ada perubahan rekening</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select></label>
                <label className={tw("field-label")}>Perubahan Saldo Rekening<span className={tw("field-note")}>Contoh transfer keluar: -100000</span><CurrencyInput allowNegative value={agentForm.bank_effect} onChange={(value) => onAgentFormChange({ ...agentForm, bank_effect: value })} /></label>
                <label className={tw("field-label")}>Perubahan Kas Tunai<span className={tw("field-note")}>Contoh pelanggan bayar tunai: 105000</span><CurrencyInput allowNegative value={agentForm.cash_effect} onChange={(value) => onAgentFormChange({ ...agentForm, cash_effect: value })} /></label>
              </div>
              <div className={tw("wizard-actions")}><Button variant="secondary" onClick={() => onAgentStepChange(2)}>Kembali</Button><Button onClick={() => onAgentStepChange(4)}>Review & Simpan</Button></div>
            </div>
          )}

          {agentStep === 4 && (
            <div className={tw("workflow-content")}>
              <CardHeader><div><h2>Review Transaksi</h2><p>Pastikan ringkasan sudah benar sebelum disimpan.</p></div></CardHeader>
              <div className={tw("review-box electron-review-box")}>
                <div><span>Layanan</span><strong>{agentForm.service_name || "-"}</strong></div>
                <div><span>Nominal</span><strong>{formatRupiah(Number(agentForm.amount || 0))}</strong></div>
                <div><span>Admin Toko</span><strong>{formatRupiah(Number(agentForm.fee || 0))}</strong></div>
                <div><span>Potongan Bank/Provider</span><strong>{formatRupiah(Number(agentForm.provider_cost || 0))}</strong></div>
                <div><span>Keuntungan Jasa</span><strong>{formatRupiah(agentProfit)}</strong></div>
                <div><span>Total Bayar</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
                <div><span>Perubahan Rekening</span><strong>{formatRupiah(Number(agentForm.bank_effect || 0))}</strong></div>
                <div><span>Perubahan Kas</span><strong>{formatRupiah(Number(agentForm.cash_effect || 0))}</strong></div>
              </div>
              <div className={tw("wizard-actions")}><Button variant="secondary" onClick={() => onAgentStepChange(3)}>Kembali</Button><Button onClick={(event) => onSubmitAgentTransaction(event as unknown as FormEvent)} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Transaksi Agen"}</Button></div>
            </div>
          )}
        </Card>

        <SectionCard className={tw("service-history-panel")} title="Riwayat Layanan" description="Transaksi layanan terbaru.">
          {agentTransactions.length === 0 ? <EmptyState title="Belum ada transaksi agen" description="Pilih layanan untuk mulai mencatat transaksi." /> : agentTransactions.slice(0, 8).map((transaction) => (
            <div key={transaction.id} className={tw("row rich-row")}>
              <div><strong>{transaction.notes || transaction.invoice_no}</strong><small>{transaction.invoice_no} • Untung {formatRupiah(transaction.profit)}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </SectionCard>
      </section>
    </>
  );
}
