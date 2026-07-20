import type { FormEvent } from "react";
import type { AccountRow, TransactionRow } from "../api";
import type { AgentForm } from "../types";
import { CurrencyInput } from "../components/CurrencyInput";
import { formatRupiah } from "../lib/format";

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
  const agentTransactions = transactions.filter((transaction) => transaction.transaction_type === "agent");
  const totalCustomerPay = Number(agentForm.amount || 0) + Number(agentForm.fee || 0);
  const agentProfit = Number(agentForm.fee || 0) - Number(agentForm.provider_cost || 0);

  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Pencatatan Layanan</p><h1>Layanan Agen</h1></div><div className="page-actions"><button className="secondary" onClick={() => onAgentStepChange(1)}>Pilih Layanan</button><button onClick={() => onAgentStepChange(4)}>Review</button></div></div>
      <div className="stepper agent-stepper">
        <button className={agentStep === 1 ? "step active" : "step"} onClick={() => onAgentStepChange(1)}><span>1</span>Pilih Layanan</button>
        <button className={agentStep === 2 ? "step active" : "step"} onClick={() => onAgentStepChange(2)}><span>2</span>Nominal</button>
        <button className={agentStep === 3 ? "step active" : "step"} onClick={() => onAgentStepChange(3)}><span>3</span>Perubahan Saldo</button>
        <button className={agentStep === 4 ? "step active" : "step"} onClick={() => onAgentStepChange(4)}><span>4</span>Simpan</button>
      </div>
      <section className="grid workspace-grid">
        <div className="card">
          {agentStep === 1 && (
            <div className="workflow-content">
              <div className="card-header"><div><h2>1. Pilih Jenis Layanan</h2><p>Pilih preset yang paling mendekati transaksi pelanggan.</p></div></div>
              <div className="service-section-title">Layanan Favorit</div>
              <div className="service-card-grid">
                <button type="button" className="service-card" onClick={() => onApplyPreset("withdraw")}><span className="service-icon">TT</span><strong>Tarik Tunai</strong><small>Pelanggan ambil uang tunai</small><em>Admin umum Rp5.000</em></button>
                <button type="button" className="service-card" onClick={() => onApplyPreset("deposit")}><span className="service-icon">ST</span><strong>Setor Tunai</strong><small>Setor ke rekening/e-wallet</small><em>Admin umum Rp5.000</em></button>
                <button type="button" className="service-card" onClick={() => onApplyPreset("transfer")}><span className="service-icon">TR</span><strong>Transfer</strong><small>Transfer bank/provider</small><em>Admin umum Rp5.000</em></button>
                <button type="button" className="service-card" onClick={() => onApplyPreset("payment")}><span className="service-icon">TP</span><strong>Payment/Topup</strong><small>Token, pulsa, tagihan</small><em>Admin mulai Rp2.500</em></button>
              </div>
              <label>Nama Layanan<input value={agentForm.service_name} onChange={(event) => onAgentFormChange({ ...agentForm, service_name: event.target.value })} /></label>
              <button onClick={() => onAgentStepChange(2)}>Lanjut Isi Nominal</button>
            </div>
          )}
          {agentStep === 2 && (
            <div className="workflow-content">
              <div className="card-header"><div><h2>2. Isi Nominal</h2><p>Pisahkan nominal transaksi dan admin toko agar profit jelas.</p></div></div>
              <div className="product-form no-box">
                <label>Nama Pelanggan<input value={agentForm.customer_name} onChange={(event) => onAgentFormChange({ ...agentForm, customer_name: event.target.value })} /></label>
                <label>Nominal Transaksi<span className="field-note">Nilai uang transfer/pulsa/token.</span><CurrencyInput value={agentForm.amount} onChange={(value) => onAgentFormChange({ ...agentForm, amount: value })} /></label>
                <label>Admin Toko / Fee<span className="field-note">Biaya admin yang dibayar pelanggan.</span><CurrencyInput value={agentForm.fee} onChange={(value) => onAgentFormChange({ ...agentForm, fee: value })} /></label>
                <label>Potongan Bank/Provider<span className="field-note">Potongan dari bank/provider. Profit = Admin Toko - Biaya Modal.</span><CurrencyInput value={agentForm.provider_cost} onChange={(value) => onAgentFormChange({ ...agentForm, provider_cost: value })} /></label>
                <label>Catatan<input value={agentForm.notes} onChange={(event) => onAgentFormChange({ ...agentForm, notes: event.target.value })} /></label>
              </div>
              <div className="total-row"><span>Total Bayar Pelanggan</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
              <div className="total-row"><span>Estimasi Keuntungan Jasa</span><strong>{formatRupiah(agentProfit)}</strong></div>
              <div className="wizard-actions"><button className="secondary" onClick={() => onAgentStepChange(1)}>Kembali</button><button onClick={() => onAgentStepChange(3)}>Lanjut Perubahan Saldo</button></div>
            </div>
          )}
          {agentStep === 3 && (
            <div className="workflow-content">
              <div className="card-header"><div><h2>3. Atur Perubahan Saldo</h2><p>Isi hanya saldo yang benar-benar berubah. Positif menambah, negatif mengurangi.</p></div></div>
              <div className="product-form no-box">
                <label>Rekening Layanan<select value={agentForm.account_id} onChange={(event) => onAgentFormChange({ ...agentForm, account_id: event.target.value })}>
                  <option value="">Tidak ada efek rekening</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select></label>
                <label>Perubahan Saldo Rekening<span className="field-note">Contoh transfer keluar: -100000</span><CurrencyInput allowNegative value={agentForm.bank_effect} onChange={(value) => onAgentFormChange({ ...agentForm, bank_effect: value })} /></label>
                <label>Perubahan Kas Tunai<span className="field-note">Contoh pelanggan bayar tunai: 105000</span><CurrencyInput allowNegative value={agentForm.cash_effect} onChange={(value) => onAgentFormChange({ ...agentForm, cash_effect: value })} /></label>
              </div>
              <div className="wizard-actions"><button className="secondary" onClick={() => onAgentStepChange(2)}>Kembali</button><button onClick={() => onAgentStepChange(4)}>Review & Simpan</button></div>
            </div>
          )}
          {agentStep === 4 && (
            <div className="workflow-content">
              <div className="card-header"><div><h2>4. Review Transaksi</h2><p>Pastikan ringkasan sudah benar sebelum disimpan.</p></div></div>
              <div className="review-box">
                <div><span>Layanan</span><strong>{agentForm.service_name || "-"}</strong></div>
                <div><span>Nominal</span><strong>{formatRupiah(Number(agentForm.amount || 0))}</strong></div>
                <div><span>Admin Toko</span><strong>{formatRupiah(Number(agentForm.fee || 0))}</strong></div>
                <div><span>Potongan Bank/Provider</span><strong>{formatRupiah(Number(agentForm.provider_cost || 0))}</strong></div>
                <div><span>Keuntungan Jasa</span><strong>{formatRupiah(agentProfit)}</strong></div>
                <div><span>Total Bayar</span><strong>{formatRupiah(totalCustomerPay)}</strong></div>
                <div><span>Perubahan Rekening</span><strong>{formatRupiah(Number(agentForm.bank_effect || 0))}</strong></div>
                <div><span>Perubahan Kas</span><strong>{formatRupiah(Number(agentForm.cash_effect || 0))}</strong></div>
              </div>
              <div className="wizard-actions"><button className="secondary" onClick={() => onAgentStepChange(3)}>Kembali</button><button onClick={(event) => onSubmitAgentTransaction(event as unknown as FormEvent)} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Transaksi Agen"}</button></div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-header"><div><h2>Riwayat Layanan Agen</h2><p>Transaksi yang sudah dicatat hari ini/terakhir.</p></div></div>
          {agentTransactions.length === 0 ? <div className="empty-state"><strong>Belum ada transaksi agen</strong><span>Mulai dari langkah 1 untuk mencatat layanan.</span></div> : agentTransactions.map((transaction) => (
            <div key={transaction.id} className="row rich-row">
              <div><strong>{transaction.notes || transaction.invoice_no}</strong><small>{transaction.invoice_no} • Untung {formatRupiah(transaction.profit)}</small></div>
              <strong>{formatRupiah(transaction.total_amount)}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
