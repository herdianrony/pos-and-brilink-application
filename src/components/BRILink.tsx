"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Select, Card, Spinner, EmptyState, Badge, useToast } from "@/components/ui";
import { Landmark, CheckCircle, X, Search, ArrowUpRight, Banknote, Building2, AlertTriangle, Wallet, Layers } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";
import { useSettings } from "@/lib/use-settings";

interface FeeTier {
  id: number;
  serviceId: number;
  minAmount: string;
  maxAmount: string | null;
  adminFee: string;
  agentFee: string;
}

interface Service {
  id: number; name: string; categoryId: number | null; categoryName: string | null;
  categoryIcon: string | null; categoryColor: string | null;
  icon: string | null; adminFee: string; agentFee: string;
  useTieredFee: boolean;
  feeTiers: FeeTier[];
  cashEffect: string; bankEffect: string;
  description: string | null; isActive: boolean;
}
interface ServiceCat { id: number; name: string; icon: string | null; color: string | null; }
interface Account { id: number; code: string; name: string; icon: string | null; color: string | null; balance: string; minBalance: string | null; }

// Helper function to calculate fee based on amount and tiers
function calculateFee(amount: number, service: Service): { adminFee: number; agentFee: number; tier: FeeTier | null } {
  if (!service.useTieredFee || service.feeTiers.length === 0) {
    return {
      adminFee: parseFloat(service.adminFee),
      agentFee: parseFloat(service.agentFee),
      tier: null,
    };
  }
  
  // Find matching tier
  for (const tier of service.feeTiers) {
    const min = parseFloat(tier.minAmount);
    const max = tier.maxAmount ? parseFloat(tier.maxAmount) : Infinity;
    if (amount >= min && amount <= max) {
      return {
        adminFee: parseFloat(tier.adminFee),
        agentFee: parseFloat(tier.agentFee),
        tier,
      };
    }
  }
  
  // Fallback to default fee
  return {
    adminFee: parseFloat(service.adminFee),
    agentFee: parseFloat(service.agentFee),
    tier: null,
  };
}

export default function BRILink() {
  const [services, setServices] = useState<Service[]>([]);
  const [cats, setCats] = useState<ServiceCat[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const servicesLabel = settings.services_label || "Layanan Agen";
  const toast = useToast();
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Service | null>(null);
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", amount: "", notes: "",
    paymentMethod: "cash", selectedBankId: "", periode: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [lastInv, setLastInv] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/brilink-services").then(r => r.json()),
      fetch("/api/service-categories").then(r => r.json()),
      fetch("/api/accounts").then(r => r.json()),
    ]).then(([s, c, a]) => { 
      setServices(s); 
      setCats(c); 
      setAccounts(a); 
      const bankAccs = a.filter((acc: Account) => acc.code !== "cash");
      if (bankAccs.length > 0) {
        setForm(f => ({ ...f, selectedBankId: bankAccs[0].id.toString() }));
      }
      setLoading(false); 
    });
  }, []);

  const filtered = services.filter(s => {
    if (catFilter !== "all" && s.categoryId?.toString() !== catFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, Service[]>>((acc, s) => {
    const key = s.categoryName || "Lainnya";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const bankAccounts = accounts.filter(a => a.code !== "cash");
  const selectedBank = bankAccounts.find(a => a.id.toString() === form.selectedBankId);
  
  // Calculate dynamic fee based on amount
  const { adminFee, agentFee, tier: currentTier } = useMemo(() => {
    if (!sel) return { adminFee: 0, agentFee: 0, tier: null };
    const amount = parseFloat(form.amount || "0");
    return calculateFee(amount, sel);
  }, [sel, form.amount]);
  
  const totalAmt = parseFloat(form.amount || "0") + adminFee;
  
  // Calculate profit - with same-bank strategy, ALL admin fee is profit!
  // No interbank cost when using matching bank account
  const isSameBankTransfer = selectedBank?.name?.toLowerCase().includes(
    form.customerPhone?.toLowerCase().includes("bri") ? "bri" :
    form.customerPhone?.toLowerCase().includes("mandiri") ? "mandiri" :
    form.customerPhone?.toLowerCase().includes("bca") ? "bca" :
    form.customerPhone?.toLowerCase().includes("bni") ? "bni" : ""
  ) || false;
  
  // With multi-bank strategy: admin fee = profit (no bank cost)
  const actualProfit = adminFee; // 100% profit karena pakai rekening yang sama
  const potentialExtraProfit = adminFee - agentFee; // Selisih dari fee yang seharusnya ke bank

  // Check if selected bank has enough balance
  const bankNeedsBalance = sel?.bankEffect === "out";
  const bankBalance = selectedBank ? parseFloat(selectedBank.balance) : 0;
  const hasEnoughBankBalance = !bankNeedsBalance || bankBalance >= parseFloat(form.amount || "0");

  async function handleSubmit() {
    if (!sel || !form.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "brilink",
          serviceId: sel.id,
          subType: sel.name,
          customerName: form.customerName || null,
          customerPhone: form.customerPhone || null,
          totalAmount: parseFloat(form.amount),
          adminFee: adminFee,
          agentFee: agentFee,
          cashEffect: sel.cashEffect,
          bankEffect: sel.bankEffect,
          bankAccountId: form.selectedBankId ? parseInt(form.selectedBankId) : null,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
        }),
      });
      const trx = await res.json();
      // P0-1: Check res.ok before showing success
      if (!res.ok) {
        toast.error(trx.error || "Transaksi gagal diproses");
        return; // Don't close modal, don't clear form
      }
      setLastInv(trx.invoiceNo);
      setSel(null);
      setShowDone(true);
      setForm({ ...form, customerName: "", customerPhone: "", amount: "", notes: "", periode: "" });
      const newAccs = await fetch("/api/accounts").then(r => r.json());
      setAccounts(newAccs);
      toast.success("Transaksi berhasil!");
    } catch { toast.error("Gagal memproses transaksi"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Landmark size={24} className="text-purple-500" /> {servicesLabel}
        </h2>
        <p className="text-sm text-slate-400">Pilih layanan dan proses transaksi nasabah</p>
      </div>

      {/* Account Balance Summary — compact */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {accounts.map(acc => {
          const isLow = parseFloat(acc.balance) < parseFloat(acc.minBalance || "0");
          return (
            <div 
              key={acc.id} 
              className={cn(
                "p-3 rounded-2xl border shrink-0 min-w-[140px] transition-all",
                "bg-white border-slate-200 hover:shadow-card",
                isLow && "ring-2 ring-amber-400"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isBankIcon(acc.icon) ? <BankIcon name={acc.icon} size={16} /> : <DynamicIcon name={acc.icon} fallback="credit-card" size={14} className="text-slate-500" />}
                <span className="text-xs font-semibold text-slate-600 truncate">{acc.name.split(" ").slice(0,2).join(" ")}</span>
                {isLow && <AlertTriangle size={10} className="text-amber-500" />}
              </div>
              <p className="text-sm font-extrabold text-slate-800">
                {formatRupiah(acc.balance)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari layanan..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm shadow-soft" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setCatFilter("all")}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              catFilter === "all" ? "bg-primary text-white shadow-card" : "bg-white text-slate-600 border border-slate-200")}>
            Semua
          </button>
          {cats.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id.toString())}
              className={cn("px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                catFilter === c.id.toString() ? "bg-primary text-white shadow-card" : "bg-white text-slate-600 border border-slate-200")}>
              <DynamicIcon name={c.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />{c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon="search" title="Layanan tidak ditemukan" />
      ) : (
        Object.entries(grouped).map(([cat, svcs]) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">{cat}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {svcs.map(s => (
                <button key={s.id} onClick={() => setSel(s)}
                  className={cn(
                    "p-4 rounded-2xl text-left transition-all duration-200 border-2 group hover:shadow-pop flex flex-col items-center text-center gap-2",
                    sel?.id === s.id ? "bg-purple-50 border-purple-400 shadow-card" : "bg-white border-transparent hover:border-slate-200"
                  )}>
                  {isBankIcon(s.icon) ? (
                    <BankIcon name={s.icon} size={36} className="group-hover:scale-110 transition-transform" />
                  ) : (
                    <DynamicIcon name={s.icon} fallback="credit-card" size={32} className="text-primary group-hover:scale-110 transition-transform" />
                  )}
                  <p className="font-semibold text-sm text-slate-800 leading-tight">{s.name}</p>
                  {s.useTieredFee ? (
                    <Badge variant="purple">
                      <Layers size={10} className="mr-0.5" /> Berjenjang
                    </Badge>
                  ) : (
                    <Badge variant="warning">Fee: {formatRupiah(s.adminFee)}</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Transaction Form Modal */}
      <Modal open={!!sel} onClose={() => setSel(null)} size="lg">
        {sel && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBankIcon(sel.icon) ? (
                  <BankIcon name={sel.icon} size={36} />
                ) : (
                  <DynamicIcon name={sel.icon} fallback="credit-card" size={32} className="text-primary" />
                )}
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">{sel.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-400">{sel.categoryName}</p>
                    {sel.useTieredFee && (
                      <Badge variant="purple"><Layers size={10} /> Fee Berjenjang</Badge>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* Fee Tiers Info */}
            {sel.useTieredFee && sel.feeTiers.length > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="text-purple-700 font-medium text-sm mb-2 flex items-center gap-1.5">
                  <Layers size={14} /> Skema Biaya Admin Berjenjang:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {sel.feeTiers.map((tier, i) => (
                    <div 
                      key={tier.id} 
                      className={cn(
                        "p-2 rounded-xl border transition-all",
                        currentTier?.id === tier.id 
                          ? "bg-purple-200 border-purple-400 ring-2 ring-purple-300" 
                          : "bg-white border-purple-100"
                      )}
                    >
                      <p className="text-slate-600">
                        {formatRupiah(tier.minAmount)} - {tier.maxAmount ? formatRupiah(tier.maxAmount) : "∞"}
                      </p>
                      <p className="font-bold text-purple-700">Admin: {formatRupiah(tier.adminFee)}</p>
                      <p className="text-emerald-600 text-[10px]">Fee: {formatRupiah(tier.agentFee)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bank Account Selection */}
            {sel.bankEffect !== "none" && bankAccounts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Wallet size={16} className="text-emerald-500" />
                  Pilih Rekening untuk Transaksi Ini
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {bankAccounts.map(acc => {
                    const isSelected = form.selectedBankId === acc.id.toString();
                    const isLow = parseFloat(acc.balance) < parseFloat(acc.minBalance || "0");
                    const needsBalance = sel.bankEffect === "out";
                    const hasBalance = parseFloat(acc.balance) >= parseFloat(form.amount || "0");
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setForm({ ...form, selectedBankId: acc.id.toString() })}
                        className={cn(
                          "p-3 rounded-xl border-2 text-left transition-all",
                          isSelected 
                            ? "bg-emerald-50 border-blue-500 ring-2 ring-blue-200" 
                            : "bg-slate-50 border-slate-200 hover:border-slate-300",
                          needsBalance && !hasBalance && form.amount && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          isBankIcon(acc.icon) ? <BankIcon name={acc.icon} size={18} /> : <DynamicIcon name={acc.icon} fallback="credit-card" size={16} className="text-slate-500" />
                          <span className="text-xs font-medium text-slate-700 truncate">{acc.name}</span>
                        </div>
                        <p className={cn("text-sm font-bold", isLow ? "text-amber-600" : "text-slate-800")}>
                          {formatRupiah(acc.balance)}
                        </p>
                        {needsBalance && !hasBalance && form.amount && (
                          <p className="text-[10px] text-red-500 mt-1">Saldo tidak cukup</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cash/Bank Effect Info */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
              <p className="text-slate-700 font-medium mb-2">bar-chart-3 Efek ke Saldo:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className={cn("flex items-center gap-2 px-2 py-1.5 rounded-xl", sel.cashEffect === "in" ? "bg-emerald-100" : sel.cashEffect === "out" ? "bg-red-100" : "bg-slate-100")}>
                  <Banknote size={14} className={sel.cashEffect === "in" ? "text-emerald-600" : sel.cashEffect === "out" ? "text-red-500" : "text-slate-400"} />
                  <span className={sel.cashEffect === "in" ? "text-emerald-700" : sel.cashEffect === "out" ? "text-red-600" : "text-slate-500"}>
                    Kas: {sel.cashEffect === "in" ? "plus Masuk" : sel.cashEffect === "out" ? "minus Keluar" : "—"}
                  </span>
                </div>
                <div className={cn("flex items-center gap-2 px-2 py-1.5 rounded-xl", sel.bankEffect === "in" ? "bg-emerald-100" : sel.bankEffect === "out" ? "bg-red-100" : "bg-slate-100")}>
                  <Building2 size={14} className={sel.bankEffect === "in" ? "text-emerald-600" : sel.bankEffect === "out" ? "text-red-500" : "text-slate-400"} />
                  <span className={sel.bankEffect === "in" ? "text-emerald-700" : sel.bankEffect === "out" ? "text-red-600" : "text-slate-500"}>
                    {selectedBank?.name || "M-Banking"}: {sel.bankEffect === "in" ? "plus Masuk" : sel.bankEffect === "out" ? "minus Keluar" : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Pelanggan" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Nama nasabah" />
              <Input label="No. HP / No. Rekening Tujuan" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="08xx / 0012xxx" />

              {/* BPJS Periode — show only for BPJS service */}
              {sel?.name?.toLowerCase().includes("bpjs") && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Periode (Bulan)</label>
                  <input
                    type="month"
                    value={form.periode}
                    onChange={(e) => setForm({ ...form, periode: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Input 
                  label="Nominal Transaksi" 
                  type="number" 
                  value={form.amount} 
                  onChange={e => setForm({ ...form, amount: e.target.value })} 
                  placeholder="0" 
                  className="text-lg font-extrabold" 
                />
                {sel.useTieredFee && form.amount && currentTier && (
                  <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">Tier: {formatRupiah(currentTier.minAmount)} - {currentTier.maxAmount ? formatRupiah(currentTier.maxAmount) : "∞"}
                  </p>
                )}
              </div>
              <Select label="Nasabah Bayar Dengan" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer ke Rekening Agen</option>
              </Select>
            </div>
            <Input label="Catatan (opsional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan..." />

            <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Nominal Transaksi</span>
                <span className="font-semibold">{formatRupiah(form.amount || "0")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Biaya Admin (dari Nasabah)
                  {sel.useTieredFee && <span className="text-purple-500 text-xs ml-1">(auto)</span>}
                </span>
                <span className="font-semibold text-amber-600">{formatRupiah(adminFee)}</span>
              </div>
              <div className="border-t border-purple-200 pt-2 flex justify-between text-lg font-extrabold">
                <span>Total Bayar Nasabah</span>
                <span className="text-primary">{formatRupiah(totalAmt)}</span>
              </div>
            </Card>
            
            {/* Profit Calculation - Multi-Bank Strategy */}
            {adminFee > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={18} className="text-emerald-600" />
                  <span className="font-bold text-emerald-700">Keuntungan Anda (Multi-Bank Strategy)</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Biaya Admin dari Nasabah</span>
                    <span className="font-semibold">{formatRupiah(adminFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Biaya ke Bank (sesama bank)</span>
                    <span className="font-semibold text-emerald-600">Rp 0 check</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-emerald-200">
                    <span className="font-bold text-emerald-700">PROFIT BERSIH</span>
                    <span className="font-bold text-emerald-600 text-lg">{formatRupiah(adminFee)}</span>
                  </div>
                </div>
                {potentialExtraProfit > 0 && (
                  <div className="mt-3 bg-emerald-100 rounded-xl p-2 text-xs text-emerald-700">
                    <p className="font-semibold">Anda hemat {formatRupiah(potentialExtraProfit)} biaya antar bank!</p>
                    <p>Tanpa multi-bank, profit hanya {formatRupiah(agentFee)} (dikurangi biaya transfer antar bank)</p>
                  </div>
                )}
              </div>
            )}

            {/* Warning if insufficient balance */}
            {!hasEnoughBankBalance && form.amount && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Saldo {selectedBank?.name} tidak cukup!</p>
                  <p className="text-xs mt-0.5">Saldo: {formatRupiah(selectedBank?.balance || "0")} — Butuh: {formatRupiah(form.amount)}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setSel(null)}>Batal</Button>
              <Button variant="primary" size="lg" className="flex-1" onClick={handleSubmit}
                disabled={submitting || !form.amount || parseFloat(form.amount) <= 0 || !hasEnoughBankBalance}>
                {submitting ? "Memproses..." : "Proses Transaksi"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success */}
      <Modal open={showDone} onClose={() => setShowDone(false)} size="sm">
        <div className="p-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800">Transaksi {servicesLabel} Berhasil!</h3>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400">No. Invoice</p>
            <p className="font-mono font-bold text-lg text-primary">{lastInv}</p>
          </div>
          <p className="text-xs text-slate-400">Saldo kas & rekening telah diperbarui otomatis</p>
          <Button variant="primary" size="lg" className="w-full" onClick={() => setShowDone(false)}>OK</Button>
        </div>
      </Modal>
    </div>
  );
}
