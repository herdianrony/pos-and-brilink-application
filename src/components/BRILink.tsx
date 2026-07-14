"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Select, Card, Spinner, EmptyState, Badge, useToast } from "@/components/ui";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Landmark, CheckCircle, X, Search, ArrowUpRight, Banknote, Building2, AlertTriangle, Wallet, Layers, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";
import { useSettings } from "@/lib/use-settings";
import { getFlowConfig, getToneClasses, FEE_METHOD_LABELS, calculateCashFlow, type FeeMethod } from "@/lib/service-flow";

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
  // S-04: explicit flow type and default fee method from DB
  flowType?: string | null;
  defaultFeeMethod?: string | null;
  description: string | null; isActive: boolean;
}
interface ServiceCat { id: number; name: string; icon: string | null; color: string | null; }
interface Account { id: number; code: string; name: string; icon: string | null; color: string | null; balance: string; minBalance: string | null; isActive?: boolean; }

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
    paymentMethod: "cash", selectedBankId: "", periode: "",
    feeMethod: "cash" as FeeMethod,
    referenceNo: "",
  });
  const [denomination, setDenomination] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  // P1: Only show active bank accounts in selector (inactive templates hidden)
  const bankAccounts = accounts.filter(a => a.code !== "cash" && a.isActive !== false);
  const cashAccount = accounts.find(a => a.code === "cash");
  const selectedBank = bankAccounts.find(a => a.id.toString() === form.selectedBankId);

  // ── Flow config (context-specific UI/UX) ─────────
  const flowConfig = useMemo(() => sel ? getFlowConfig(sel) : null, [sel]);
  const toneClasses = useMemo(() => flowConfig ? getToneClasses(flowConfig.tone) : null, [flowConfig]);

  // Calculate dynamic fee based on amount
  const { adminFee, agentFee, tier: currentTier } = useMemo(() => {
    if (!sel) return { adminFee: 0, agentFee: 0, tier: null };
    const amount = parseFloat(form.amount || "0");
    return calculateFee(amount, sel);
  }, [sel, form.amount]);

  const nominalAmount = parseFloat(form.amount || "0");

  // ── S-02: Use shared calculateCashFlow for UI/backend consistency ──
  const cashFlow = useMemo(() => {
    if (!sel) return { cashReceived: 0, cashDispensed: 0, cashDelta: 0, physicalCashAmount: 0 };
    return calculateCashFlow(sel.cashEffect, nominalAmount, adminFee, form.feeMethod);
  }, [sel, nominalAmount, adminFee, form.feeMethod]);

  const totalCashFlow = cashFlow.cashDelta;

  // ── Balance preview (before → after) ─────────────
  const cashBalanceBefore = cashAccount ? parseFloat(cashAccount.balance) : 0;
  const cashBalanceAfter = cashBalanceBefore + totalCashFlow;
  const bankBalanceBefore = selectedBank ? parseFloat(selectedBank.balance) : 0;
  const bankBalanceAfter = sel && selectedBank
    ? sel.bankEffect === "out"
      ? bankBalanceBefore - nominalAmount
      : sel.bankEffect === "in"
        ? bankBalanceBefore + nominalAmount
        : bankBalanceBefore
    : bankBalanceBefore;

  const totalAmt = cashFlow.physicalCashAmount;

  // With multi-bank strategy: admin fee = profit (no bank cost)
  const actualProfit = adminFee;
  const potentialExtraProfit = adminFee - agentFee;

  // Denomination total (for deposit verification)
  const denominationTotal = useMemo(() => {
    return Object.entries(denomination).reduce((sum, [val, count]) => sum + parseInt(val) * count, 0);
  }, [denomination]);

  // Check if selected bank has enough balance
  const bankNeedsBalance = sel?.bankEffect === "out";
  const bankBalance = selectedBank ? parseFloat(selectedBank.balance) : 0;
  const hasEnoughBankBalance = !bankNeedsBalance || bankBalance >= parseFloat(form.amount || "0");

  // Check if cash has enough balance (for cash_withdrawal) — S-02: use cashDispensed
  const cashNeedsBalance = sel?.cashEffect === "out";
  const hasEnoughCashBalance = !cashNeedsBalance || cashBalanceBefore >= cashFlow.cashDispensed;

  // Cash insufficient amount (for display) — S-02: based on cashDispensed
  const cashShortfall = cashNeedsBalance && cashFlow.cashDispensed > cashBalanceBefore ? cashFlow.cashDispensed - cashBalanceBefore : 0;

  // Overall can submit — S-04: inquiry doesn't require nominal
  const canSubmit = (flowConfig?.requiresNominal === false || nominalAmount > 0) && hasEnoughBankBalance && hasEnoughCashBalance;

  async function handleSubmit() {
    // Now called only after confirmation dialog
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
          feeMethod: form.feeMethod,
          cashEffect: sel.cashEffect,
          bankEffect: sel.bankEffect,
          bankAccountId: form.selectedBankId ? parseInt(form.selectedBankId) : null,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
          denomination: flowConfig?.showDenomination ? denomination : null,
          referenceNo: form.referenceNo || null,
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
      setShowConfirm(false);
      setShowDone(true);
      setForm({ ...form, customerName: "", customerPhone: "", amount: "", notes: "", periode: "", feeMethod: "cash", referenceNo: "" });
      setDenomination({});
      const newAccs = await fetch("/api/accounts").then(r => r.json());
      setAccounts(newAccs);
      toast.success("Transaksi berhasil!");
    } catch { toast.error("Gagal memproses transaksi"); }
    finally { setSubmitting(false); }
  }

  function attemptSubmit() {
    // S-04: inquiry flow doesn't require nominal
    if (flowConfig?.requiresNominal !== false) {
      if (!form.amount || parseFloat(form.amount) <= 0) {
        toast.error("Nominal belum diisi");
        return;
      }
    }
    if (!hasEnoughBankBalance) {
      toast.error("Saldo rekening tidak cukup untuk transaksi ini");
      return;
    }
    if (!hasEnoughCashBalance) {
      toast.error("Saldo kas tidak cukup untuk penarikan tunai");
      return;
    }
    setShowConfirm(true);
  }

  const [recentServices, setRecentServices] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("brilink_recent_services");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  function trackRecent(serviceId: number) {
    setRecentServices(prev => {
      const updated = [serviceId, ...prev.filter(id => id !== serviceId)].slice(0, 6);
      try { localStorage.setItem("brilink_recent_services", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  // S-04: When selecting a service, set default fee method from DB
  function selectService(s: Service) {
    setSel(s);
    trackRecent(s.id);
    setForm(f => ({ ...f, feeMethod: (s.defaultFeeMethod as FeeMethod) || "cash" }));
  }

  if (loading) return <Spinner />;

  const recentSvcObjects = recentServices
    .map(id => services.find(s => s.id === id))
    .filter(Boolean) as Service[];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Landmark size={24} className="text-purple-500" /> {servicesLabel}
        </h2>
        <p className="text-sm text-slate-400">Pilih layanan dan proses transaksi nasabah</p>
      </div>

      {/* Sprint 2: Recent Services — quick access */}
      {recentSvcObjects.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Terakhir Dipakai</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentSvcObjects.map(s => (
              <button
                key={s.id}
                onClick={() => selectService(s)}
                className="shrink-0 p-3 rounded-2xl bg-white border-2 border-transparent hover:border-purple-300 hover:shadow-card transition-all flex flex-col items-center gap-1.5 min-w-[100px]"
              >
                {isBankIcon(s.icon) ? (
                  <BankIcon name={s.icon} size={28} />
                ) : (
                  <DynamicIcon name={s.icon} fallback="credit-card" size={28} className="text-purple-500" />
                )}
                <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
                <button key={s.id} onClick={() => selectService(s)}
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

      {/* Transaction Form Modal — flow-aware */}
      <Modal open={!!sel} onClose={() => setSel(null)} size="lg">
        {sel && flowConfig && toneClasses && (
          <div className="p-5 space-y-5">
            {/* ── Header with flow-specific tone ────────── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBankIcon(sel.icon) ? (
                  <BankIcon name={sel.icon} size={36} />
                ) : (
                  <DynamicIcon name={sel.icon} fallback="credit-card" size={32} className={toneClasses.accent} />
                )}
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">{flowConfig.title}: {sel.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-400">{flowConfig.subtitle}</p>
                    {sel.useTieredFee && (
                      <Badge variant="purple"><Layers size={10} /> Fee Berjenjang</Badge>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* ── Cash direction badge ──────────────────── */}
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold", toneClasses.badge)}>
              {flowConfig.cashBadgeTone === "warning" ? (
                <TrendingDown size={16} />
              ) : flowConfig.cashBadgeTone === "success" ? (
                <TrendingUp size={16} />
              ) : (
                <ArrowRight size={16} />
              )}
              {flowConfig.cashBadgeText}
            </div>

            {/* Fee Tiers Info */}
            {sel.useTieredFee && sel.feeTiers.length > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="text-purple-700 font-medium text-sm mb-2 flex items-center gap-1.5">
                  <Layers size={14} /> Skema Biaya Admin Berjenjang:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {sel.feeTiers.map((tier) => (
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

            {/* ── Account Selection — context-specific label (S-06) ── */}
            {sel.bankEffect !== "none" && bankAccounts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Wallet size={16} className="text-emerald-500" />
                  {flowConfig.accountSelectorLabel}
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
                          {isBankIcon(acc.icon) ? (
                            <BankIcon name={acc.icon} size={18} />
                          ) : (
                            <DynamicIcon name={acc.icon} fallback="credit-card" size={16} className="text-slate-500" />
                          )}
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

            {/* S-06: When bankEffect=none for cash_withdrawal, show which cash account is used */}
            {sel.bankEffect === "none" && sel.cashEffect === "out" && cashAccount && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                <p className="font-semibold text-amber-700 flex items-center gap-1.5">
                  <Banknote size={14} /> Kas Tunai yang digunakan
                </p>
                <p className="text-amber-600 mt-1">
                  {cashAccount.name}: <strong>{formatRupiah(cashAccount.balance)}</strong>
                  {cashShortfall > 0 && (
                    <span className="text-red-600 ml-2">— kurang {formatRupiah(cashShortfall)}</span>
                  )}
                </p>
              </div>
            )}

            {/* ── Form fields ─────────────────────────── */}
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
              {/* S-04: Nominal field — hidden for inquiry flow */}
              {flowConfig.requiresNominal !== false && (
                <div className="space-y-1.5">
                  <CurrencyInput
                    label="Nominal Transaksi"
                    value={form.amount}
                    onChange={(v) => setForm({ ...form, amount: String(v) })}
                    placeholder="0"
                    autoFocus
                  />
                  {sel.useTieredFee && form.amount && currentTier && (
                    <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      Tier: {formatRupiah(currentTier.minAmount)} - {currentTier.maxAmount ? formatRupiah(currentTier.maxAmount) : "∞"}
                    </p>
                  )}
                </div>
              )}

              {/* ── Fee method selection ───────────────── */}
              {flowConfig.showFeeMethod && adminFee > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Metode Biaya Admin</label>
                  <select
                    value={form.feeMethod}
                    onChange={(e) => setForm({ ...form, feeMethod: e.target.value as FeeMethod })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
                  >
                    {flowConfig.allowedFeeMethods.map(method => (
                      <option key={method} value={method}>{FEE_METHOD_LABELS[method]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400">
                    {form.feeMethod === "cash" && "Nasabah membayar fee tunai terpisah dari nominal."}
                    {form.feeMethod === "deducted" && `Nasabah menerima ${formatRupiah(Math.max(0, nominalAmount - adminFee))} (nominal dikurangi fee).`}
                    {form.feeMethod === "charged" && "Fee dibebankan ke rekening nasabah (kas tidak terdampak fee)."}
                  </p>
                </div>
              )}
            </div>

            {/* ── Denomination input (for cash_deposit) ──── */}
            {flowConfig.showDenomination && nominalAmount > 0 && (
              <div className={cn("rounded-xl border p-3 space-y-2", toneClasses.cardBorder, toneClasses.cardBg)}>
                <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Banknote size={14} /> Denominasi Uang (opsional, untuk verifikasi hitung)
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[100000, 50000, 20000, 10000, 5000, 2000, 1000, 500].map(val => (
                    <div key={val} className="bg-white rounded-lg p-2 border border-slate-200">
                      <p className="text-[10px] text-slate-500">{formatRupiah(val)}</p>
                      <input
                        type="number"
                        min={0}
                        value={denomination[val] || ""}
                        onChange={(e) => {
                          const count = parseInt(e.target.value) || 0;
                          setDenomination(prev => ({ ...prev, [val]: count }));
                        }}
                        placeholder="0"
                        className="w-full text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400">× {formatRupiah(val * (denomination[val] || 0))}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-600">Total denominasi:</span>
                  <span className={cn("font-bold", denominationTotal === nominalAmount ? "text-emerald-600" : "text-amber-600")}>
                    {formatRupiah(denominationTotal)}
                    {denominationTotal > 0 && denominationTotal !== nominalAmount && (
                      <span className="text-[10px] ml-1">
                        (selisih {formatRupiah(Math.abs(denominationTotal - nominalAmount))})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <Input label="Catatan (opsional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan..." />

            {/* S-07: Reference number for external provider transactions */}
            {flowConfig.involvesExternalProvider && (
              <Input
                label="No. Referensi Provider (opsional, isi setelah transfer/pembayaran dilakukan)"
                value={form.referenceNo}
                onChange={e => setForm({ ...form, referenceNo: e.target.value })}
                placeholder="Contoh: TRX12345678 dari M-Banking"
              />
            )}

            {/* ── Physical cash summary ──────────────── */}
            <Card className={cn("p-4 bg-gradient-to-br border space-y-2", toneClasses.summaryBg, toneClasses.summaryBorder)}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Nominal transaksi</span>
                <span className="font-semibold">{formatRupiah(nominalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Biaya admin ({FEE_METHOD_LABELS[form.feeMethod].toLowerCase()})
                </span>
                <span className="font-semibold text-amber-600">{formatRupiah(adminFee)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-extrabold">
                <span>{flowConfig.cashSummaryLabel}</span>
                <span className={toneClasses.accent}>
                  {sel.cashEffect === "out"
                    ? formatRupiah(nominalAmount)
                    : formatRupiah(totalAmt)}
                </span>
              </div>
            </Card>

            {/* ── Dampak Saldo — big preview panel ─────── */}
            <div className={cn("rounded-xl border-2 p-4 space-y-3", toneClasses.cardBorder, "bg-white")}>
              <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <DynamicIcon name="bar-chart-3" fallback="bar-chart-3" size={14} className="text-slate-500" />
                Dampak setelah transaksi
              </p>

              {/* Cash impact */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <Banknote size={16} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Kas Tunai</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">{formatRupiah(cashBalanceBefore)}</span>
                  <ArrowRight size={14} className="text-slate-400" />
                  <span className={cn("font-bold", totalCashFlow > 0 ? "text-emerald-600" : totalCashFlow < 0 ? "text-red-600" : "text-slate-700")}>
                    {totalCashFlow > 0 ? "+" : ""}{formatRupiah(cashBalanceAfter)}
                  </span>
                </div>
              </div>

              {/* Bank impact */}
              {sel.bankEffect !== "none" && selectedBank && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">{selectedBank.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">{formatRupiah(bankBalanceBefore)}</span>
                    <ArrowRight size={14} className="text-slate-400" />
                    <span className={cn("font-bold", sel.bankEffect === "in" ? "text-emerald-600" : "text-red-600")}>
                      {sel.bankEffect === "in" ? "+" : "−"}{formatRupiah(bankBalanceAfter)}
                    </span>
                  </div>
                </div>
              )}

              {/* Cash insufficient warning */}
              {cashShortfall > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>
                    Kas tersisa <strong>{formatRupiah(cashBalanceBefore)}</strong> — butuh <strong>{formatRupiah(nominalAmount)}</strong>.
                    Kekurangan: <strong>{formatRupiah(cashShortfall)}</strong>.
                    Pilih sumber saldo lain atau batalkan.
                  </span>
                </div>
              )}
            </div>

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
                  <div className="flex justify-between pt-1.5 border-t border-emerald-200">
                    <span className="font-bold text-emerald-700">PROFIT BERSIH</span>
                    <span className="font-bold text-emerald-600 text-lg">{formatRupiah(adminFee)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning if insufficient bank balance */}
            {!hasEnoughBankBalance && form.amount && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Saldo {selectedBank?.name} tidak cukup!</p>
                  <p className="text-xs mt-0.5">Saldo: {formatRupiah(selectedBank?.balance || "0")} — Butuh: {formatRupiah(nominalAmount)}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setSel(null)}>Batal</Button>
              <Button
                variant="primary"
                size="lg"
                className={cn("flex-1", toneClasses.button)}
                onClick={attemptSubmit}
                disabled={submitting || !canSubmit}
              >
                {submitting ? "Memproses..." : flowConfig.primaryActionText.replace("{amount}", formatRupiah(sel.cashEffect === "out" ? nominalAmount : totalAmt))}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Physical cash confirmation dialog ─────── */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} size="sm">
        {sel && flowConfig && toneClasses && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              {flowConfig.tone === "warning" ? (
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <TrendingDown size={24} className="text-amber-600" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <TrendingUp size={24} className="text-emerald-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">{flowConfig.confirmationHeading}</h3>
                <p className="text-xs text-slate-400">{flowConfig.title} — {sel.name}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              {flowConfig.confirmationBody
                .replace("{amount}", formatRupiah(sel.cashEffect === "out" ? nominalAmount : totalAmt))
                .replace("{account}", form.customerPhone || "—")}
            </p>

            {/* Summary in confirmation */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{flowConfig.cashSummaryLabel}</span>
                <span className="font-bold">{formatRupiah(sel.cashEffect === "out" ? nominalAmount : totalAmt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kas setelah transaksi</span>
                <span className={cn("font-bold", totalCashFlow < 0 ? "text-red-600" : "text-emerald-600")}>
                  {formatRupiah(cashBalanceAfter)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setShowConfirm(false)}>
                {flowConfig.confirmationCancelText}
              </Button>
              <Button
                size="lg"
                className={cn("flex-1", toneClasses.button)}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Memproses..." : flowConfig.confirmationConfirmText}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Success — S-07: wording distinguishes "pencatatan" from "provider berhasil" */}
      <Modal open={showDone} onClose={() => setShowDone(false)} size="sm">
        <div className="p-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800">Pencatatan Transaksi Berhasil</h3>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400">No. Invoice</p>
            <p className="font-mono font-bold text-lg text-primary">{lastInv}</p>
          </div>
          {flowConfig?.involvesExternalProvider ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-semibold">Penting:</p>
              <p>Pencatatan lokal berhasil. Pastikan transfer/pembayaran ke provider sudah dilakukan via M-Banking/EDC. Catat nomor referensi untuk verifikasi.</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Saldo kas & rekening telah diperbarui otomatis</p>
          )}
          <Button variant="primary" size="lg" className="w-full" onClick={() => setShowDone(false)}>OK</Button>
        </div>
      </Modal>
    </div>
  );
}
