"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRupiah, cn } from "@/lib/utils";
import { Modal, Button, Input, Card, Spinner, EmptyState, Badge, useToast } from "@/components/ui";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Landmark, CheckCircle, X, Search, Banknote, AlertTriangle, Wallet, Layers, TrendingDown, TrendingUp, ArrowRight, ChevronDown, ChevronUp, Building2, Star } from "lucide-react";
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
  flowType?: string | null;
  defaultFeeMethod?: string | null;
  description: string | null; isActive: boolean;
}
interface ServiceCat { id: number; name: string; icon: string | null; color: string | null; }
interface Account { id: number; code: string; name: string; icon: string | null; color: string | null; balance: string; minBalance: string | null; isActive?: boolean; }

function calculateFee(amount: number, service: Service): { adminFee: number; agentFee: number; tier: FeeTier | null } {
  if (!service.useTieredFee || service.feeTiers.length === 0) {
    return { adminFee: parseFloat(service.adminFee), agentFee: parseFloat(service.agentFee), tier: null };
  }
  for (const tier of service.feeTiers) {
    const min = parseFloat(tier.minAmount);
    const max = tier.maxAmount ? parseFloat(tier.maxAmount) : Infinity;
    if (amount >= min && amount <= max) {
      return { adminFee: parseFloat(tier.adminFee), agentFee: parseFloat(tier.agentFee), tier };
    }
  }
  return { adminFee: parseFloat(service.adminFee), agentFee: parseFloat(service.agentFee), tier: null };
}

type Step = "input" | "review" | "confirm";

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
  const [step, setStep] = useState<Step>("input");
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showDenomination, setShowDenomination] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", amount: "", notes: "",
    paymentMethod: "cash", selectedBankId: "", periode: "",
    feeMethod: "cash" as FeeMethod,
    referenceNo: "",
  });
  const [denomination, setDenomination] = useState<Record<number, number>>({});
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
      const bankAccs = a.filter((acc: Account) => acc.code !== "cash" && acc.isActive !== false);
      if (bankAccs.length > 0) {
        setForm(f => ({ ...f, selectedBankId: bankAccs[0].id.toString() }));
      }
      setLoading(false);
    });
    // Load favorites from localStorage
    try {
      const stored = localStorage.getItem("brilink_favorites");
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
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

  // P1: Only active bank accounts
  const bankAccounts = accounts.filter(a => a.code !== "cash" && a.isActive !== false);
  const cashAccount = accounts.find(a => a.code === "cash");
  const selectedBank = bankAccounts.find(a => a.id.toString() === form.selectedBankId);

  const flowConfig = useMemo(() => sel ? getFlowConfig(sel) : null, [sel]);
  const toneClasses = useMemo(() => flowConfig ? getToneClasses(flowConfig.tone) : null, [flowConfig]);

  const { adminFee, agentFee, tier: currentTier } = useMemo(() => {
    if (!sel) return { adminFee: 0, agentFee: 0, tier: null };
    const amount = parseFloat(form.amount || "0");
    return calculateFee(amount, sel);
  }, [sel, form.amount]);

  const nominalAmount = parseFloat(form.amount || "0");

  const cashFlow = useMemo(() => {
    if (!sel) return { cashReceived: 0, cashDispensed: 0, cashDelta: 0, physicalCashAmount: 0 };
    return calculateCashFlow(sel.cashEffect, nominalAmount, adminFee, form.feeMethod);
  }, [sel, nominalAmount, adminFee, form.feeMethod]);

  const totalCashFlow = cashFlow.cashDelta;
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

  const physicalCashAmount = cashFlow.physicalCashAmount;

  const denominationTotal = useMemo(() => {
    return Object.entries(denomination).reduce((sum, [val, count]) => sum + parseInt(val) * count, 0);
  }, [denomination]);

  const bankNeedsBalance = sel?.bankEffect === "out";
  const bankBalance = selectedBank ? parseFloat(selectedBank.balance) : 0;
  const hasEnoughBankBalance = !bankNeedsBalance || bankBalance >= nominalAmount;
  const cashNeedsBalance = sel?.cashEffect === "out";
  const hasEnoughCashBalance = !cashNeedsBalance || cashBalanceBefore >= cashFlow.cashDispensed;
  const cashShortfall = cashNeedsBalance && cashFlow.cashDispensed > cashBalanceBefore ? cashFlow.cashDispensed - cashBalanceBefore : 0;
  const canSubmit = (flowConfig?.requiresNominal === false || nominalAmount > 0) && hasEnoughBankBalance && hasEnoughCashBalance;

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

  function toggleFavorite(serviceId: number) {
    setFavorites(prev => {
      const updated = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      try { localStorage.setItem("brilink_favorites", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function selectService(s: Service) {
    setSel(s);
    setStep("input");
    setShowAccountPicker(false);
    setShowDenomination(false);
    setShowDetails(false);
    trackRecent(s.id);
    setForm(f => ({
      ...f,
      feeMethod: (s.defaultFeeMethod as FeeMethod) || "cash",
      customerName: "", customerPhone: "", amount: "", notes: "", periode: "", referenceNo: "",
    }));
    setDenomination({});
  }

  function closeModal() {
    setSel(null);
    setStep("input");
  }

  function goToReview() {
    if (flowConfig?.requiresNominal !== false) {
      if (!form.amount || parseFloat(form.amount) <= 0) {
        toast.error("Nominal belum diisi");
        return;
      }
    }
    if (!hasEnoughBankBalance) {
      toast.error("Saldo rekening tidak cukup");
      return;
    }
    if (!hasEnoughCashBalance) {
      toast.error("Saldo kas tidak cukup");
      return;
    }
    setStep("review");
  }

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
          adminFee,
          agentFee,
          feeMethod: form.feeMethod,
          cashEffect: sel.cashEffect,
          bankEffect: sel.bankEffect,
          bankAccountId: form.selectedBankId ? parseInt(form.selectedBankId) : null,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
          denomination: flowConfig?.showDenomination ? denomination : null,
          referenceNo: form.referenceNo || null,
          cashConfirmed: true, // P2: User confirmed physical cash in Step 3
        }),
      });
      const trx = await res.json();
      if (!res.ok) {
        toast.error(trx.error || "Transaksi gagal diproses");
        setStep("review");
        return;
      }
      setLastInv(trx.invoiceNo);
      closeModal();
      setShowDone(true);
      const newAccs = await fetch("/api/accounts").then(r => r.json());
      setAccounts(newAccs);
      toast.success("Pencatatan transaksi berhasil");
    } catch { toast.error("Gagal memproses transaksi"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <Spinner />;

  const recentSvcObjects = recentServices
    .map(id => services.find(s => s.id === id))
    .filter(Boolean) as Service[];
  const favoriteSvcObjects = favorites
    .map(id => services.find(s => s.id === id))
    .filter(Boolean) as Service[];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Landmark size={24} className="text-purple-500" /> {servicesLabel}
        </h2>
        <p className="text-sm text-slate-400">Pilih layanan dan catat transaksi nasabah</p>
      </div>

      {/* P1: Favorit + Terakhir Dipakai first */}
      {favoriteSvcObjects.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
            <Star size={12} className="text-amber-400 fill-amber-400" /> Favorit
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {favoriteSvcObjects.map(s => (
              <button key={s.id} onClick={() => selectService(s)}
                className="shrink-0 p-3 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 hover:shadow-card transition-all flex flex-col items-center gap-1.5 min-w-[100px]">
                {isBankIcon(s.icon) ? <BankIcon name={s.icon} size={28} /> : <DynamicIcon name={s.icon} fallback="credit-card" size={28} className="text-amber-500" />}
                <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {recentSvcObjects.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Terakhir Dipakai</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentSvcObjects.map(s => (
              <button key={s.id} onClick={() => selectService(s)}
                className="shrink-0 p-3 rounded-2xl bg-white border-2 border-transparent hover:border-purple-300 hover:shadow-card transition-all flex flex-col items-center gap-1.5 min-w-[100px]">
                {isBankIcon(s.icon) ? <BankIcon name={s.icon} size={28} /> : <DynamicIcon name={s.icon} fallback="credit-card" size={28} className="text-purple-500" />}
                <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + Category filters */}
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

      {/* Services grid */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon="search" title="Layanan tidak ditemukan" />
      ) : (
        Object.entries(grouped).map(([cat, svcs]) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">{cat}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {svcs.map(s => (
                <div key={s.id} className="relative group">
                  <button onClick={() => selectService(s)}
                    className={cn(
                      "w-full p-4 rounded-2xl text-left transition-all duration-200 border-2 group hover:shadow-pop flex flex-col items-center text-center gap-2",
                      sel?.id === s.id ? "bg-purple-50 border-purple-400 shadow-card" : "bg-white border-transparent hover:border-slate-200"
                    )}>
                    {isBankIcon(s.icon) ? (
                      <BankIcon name={s.icon} size={36} className="group-hover:scale-110 transition-transform" />
                    ) : (
                      <DynamicIcon name={s.icon} fallback="credit-card" size={32} className="text-primary group-hover:scale-110 transition-transform" />
                    )}
                    <p className="font-semibold text-sm text-slate-800 leading-tight">{s.name}</p>
                    {s.useTieredFee ? (
                      <Badge variant="purple"><Layers size={10} className="mr-0.5" /> Berjenjang</Badge>
                    ) : (
                      parseFloat(s.adminFee) > 0 && <Badge variant="warning">Fee: {formatRupiah(s.adminFee)}</Badge>
                    )}
                  </button>
                  {/* Favorite toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(s.id); }}
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    title={favorites.includes(s.id) ? "Hapus dari favorit" : "Tambah ke favorit"}
                  >
                    <Star size={14} className={cn(favorites.includes(s.id) ? "text-amber-400 fill-amber-400" : "text-slate-300")} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── 3-Step Transaction Modal ── */}
      <Modal open={!!sel} onClose={closeModal} size="lg">
        {sel && flowConfig && toneClasses && (
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBankIcon(sel.icon) ? (
                  <BankIcon name={sel.icon} size={36} />
                ) : (
                  <DynamicIcon name={sel.icon} fallback="credit-card" size={32} className={toneClasses.accent} />
                )}
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">{sel.name}</h3>
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-xs font-medium", step === "input" ? toneClasses.accent : "text-slate-400")}>1. Input</span>
                    <ArrowRight size={10} className="text-slate-300" />
                    <span className={cn("text-xs font-medium", step === "review" ? toneClasses.accent : "text-slate-400")}>2. Review</span>
                    <ArrowRight size={10} className="text-slate-300" />
                    <span className={cn("text-xs font-medium", step === "confirm" ? toneClasses.accent : "text-slate-400")}>3. Konfirmasi</span>
                  </div>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* ══════ STEP 1: INPUT ══════ */}
            {step === "input" && (
              <div className="space-y-4">
                {/* Cash direction badge */}
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold", toneClasses.badge)}>
                  {flowConfig.cashBadgeTone === "warning" ? <TrendingDown size={16} /> : flowConfig.cashBadgeTone === "success" ? <TrendingUp size={16} /> : <ArrowRight size={16} />}
                  {flowConfig.cashBadgeText}
                </div>

                {/* Nominal — the most important field */}
                {flowConfig.requiresNominal !== false && (
                  <div>
                    <CurrencyInput
                      label="Nominal Transaksi"
                      value={form.amount}
                      onChange={(v) => setForm({ ...form, amount: String(v) })}
                      placeholder="0"
                      autoFocus
                    />
                    {sel.useTieredFee && form.amount && currentTier && (
                      <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1">
                        Tier: {formatRupiah(currentTier.minAmount)} - {currentTier.maxAmount ? formatRupiah(currentTier.maxAmount) : "∞"}
                      </p>
                    )}
                  </div>
                )}

                {/* Quick customer info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nama Pelanggan (opsional)" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Nama nasabah" />
                  <Input label="No. HP / Rekening Tujuan" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="08xx / 0012xxx" />
                </div>

                {/* BPJS Periode */}
                {sel?.name?.toLowerCase().includes("bpjs") && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Periode (Bulan)</label>
                    <input type="month" value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium" />
                  </div>
                )}

                {/* P1: Account selector — compact dropdown */}
                {sel.bankEffect !== "none" && bankAccounts.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">{flowConfig.accountSelectorLabel}</label>
                    {!showAccountPicker ? (
                      <button
                        onClick={() => setShowAccountPicker(true)}
                        className="w-full p-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {selectedBank && (isBankIcon(selectedBank.icon) ? <BankIcon name={selectedBank.icon} size={18} /> : <DynamicIcon name={selectedBank.icon} fallback="credit-card" size={16} className="text-slate-500" />)}
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-700">{selectedBank?.name || "Pilih rekening"}</p>
                            <p className="text-xs text-slate-400">Saldo: {formatRupiah(selectedBank?.balance || "0")}</p>
                          </div>
                        </div>
                        <span className="text-xs text-primary font-medium">Ganti</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {bankAccounts.map(acc => {
                          const isSelected = form.selectedBankId === acc.id.toString();
                          const needsBalance = sel.bankEffect === "out";
                          const hasBalance = parseFloat(acc.balance) >= nominalAmount;
                          return (
                            <button
                              key={acc.id}
                              onClick={() => { setForm({ ...form, selectedBankId: acc.id.toString() }); setShowAccountPicker(false); }}
                              className={cn(
                                "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                                isSelected ? "bg-emerald-50 border-blue-500 ring-2 ring-blue-200" : "bg-white border-slate-200 hover:border-slate-300",
                                needsBalance && !hasBalance && nominalAmount > 0 && "opacity-50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isBankIcon(acc.icon) ? <BankIcon name={acc.icon} size={18} /> : <DynamicIcon name={acc.icon} fallback="credit-card" size={16} className="text-slate-500" />}
                                <div>
                                  <p className="text-sm font-semibold text-slate-700">{acc.name}</p>
                                  <p className="text-xs text-slate-400">{formatRupiah(acc.balance)}</p>
                                </div>
                              </div>
                              {isSelected && <CheckCircle size={16} className="text-blue-500" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* S-06: Cash account info for cash_withdrawal */}
                {sel.bankEffect === "none" && sel.cashEffect === "out" && cashAccount && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                    <p className="font-semibold text-amber-700 flex items-center gap-1.5"><Banknote size={14} /> Kas Tunai</p>
                    <p className="text-amber-600 mt-1">
                      Saldo: <strong>{formatRupiah(cashAccount.balance)}</strong>
                      {cashShortfall > 0 && <span className="text-red-600 ml-2">— kurang {formatRupiah(cashShortfall)}</span>}
                    </p>
                  </div>
                )}

                {/* P2: Denomination — expandable */}
                {flowConfig.showDenomination && nominalAmount > 0 && (
                  <div>
                    <button
                      onClick={() => setShowDenomination(!showDenomination)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between text-sm font-medium text-slate-700"
                    >
                      <span className="flex items-center gap-2"><Banknote size={14} /> Catat denominasi uang (opsional)</span>
                      {showDenomination ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showDenomination && (
                      <div className={cn("mt-2 rounded-xl border p-3 space-y-2", toneClasses.cardBorder, toneClasses.cardBg)}>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {[100000, 50000, 20000, 10000, 5000, 2000, 1000, 500].map(val => (
                            <div key={val} className="bg-white rounded-lg p-2 border border-slate-200">
                              <p className="text-[10px] text-slate-500">{formatRupiah(val)}</p>
                              <input type="number" min={0} value={denomination[val] || ""}
                                onChange={(e) => { const count = parseInt(e.target.value) || 0; setDenomination(prev => ({ ...prev, [val]: count })); }}
                                placeholder="0" className="w-full text-sm font-bold text-slate-800 bg-transparent focus:outline-none" />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-600">Total denominasi:</span>
                          <span className={cn("font-bold", denominationTotal === nominalAmount ? "text-emerald-600" : "text-amber-600")}>
                            {formatRupiah(denominationTotal)}
                            {denominationTotal > 0 && denominationTotal !== nominalAmount && (
                              <span className="text-[10px] ml-1">(selisih {formatRupiah(Math.abs(denominationTotal - nominalAmount))})</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* P0: Fee method — read-only display (not dropdown) */}
                {flowConfig.showFeeMethod && adminFee > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Biaya Admin</p>
                      <p className="text-sm font-bold text-slate-700">{formatRupiah(adminFee)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Metode</p>
                      <p className="text-xs font-medium text-slate-600">{FEE_METHOD_LABELS[form.feeMethod]}</p>
                    </div>
                  </div>
                )}

                {/* Cash insufficient warning */}
                {cashShortfall > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>Kas kurang {formatRupiah(cashShortfall)}. Pilih sumber saldo lain atau batalkan.</span>
                  </div>
                )}
                {!hasEnoughBankBalance && nominalAmount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>Saldo {selectedBank?.name} tidak cukup.</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className={cn("w-full", toneClasses.button)}
                  onClick={goToReview}
                  disabled={!canSubmit}
                >
                  Lanjut ke Review
                </Button>
              </div>
            )}

            {/* ══════ STEP 2: REVIEW ══════ */}
            {step === "review" && (
              <div className="space-y-4">
                {/* Physical cash summary — the most important info */}
                <Card className={cn("p-4 bg-gradient-to-br border space-y-2", toneClasses.summaryBg, toneClasses.summaryBorder)}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Nominal transaksi</span>
                    <span className="font-semibold">{formatRupiah(nominalAmount)}</span>
                  </div>
                  {adminFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Biaya admin</span>
                      <span className="font-semibold text-amber-600">{formatRupiah(adminFee)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-extrabold">
                    <span>{flowConfig.cashSummaryLabel}</span>
                    <span className={toneClasses.accent}>{formatRupiah(physicalCashAmount)}</span>
                  </div>
                </Card>

                {/* Compact balance impact */}
                <div className={cn("rounded-xl border-2 p-3 space-y-2", toneClasses.cardBorder, "bg-white")}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">Dampak Saldo</p>
                    <button onClick={() => setShowDetails(!showDetails)} className="text-xs text-primary font-medium flex items-center gap-1">
                      {showDetails ? "Sembunyikan" : "Lihat rincian"}
                      {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* Compact view — always visible */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] text-slate-400">Kas Tunai</p>
                      <p className={cn("text-sm font-bold", totalCashFlow > 0 ? "text-emerald-600" : totalCashFlow < 0 ? "text-red-600" : "text-slate-700")}>
                        {totalCashFlow > 0 ? "+" : ""}{formatRupiah(totalCashFlow)}
                      </p>
                    </div>
                    {sel.bankEffect !== "none" && selectedBank && (
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-[10px] text-slate-400">{selectedBank.name}</p>
                        <p className={cn("text-sm font-bold", sel.bankEffect === "in" ? "text-emerald-600" : "text-red-600")}>
                          {sel.bankEffect === "in" ? "+" : "−"}{formatRupiah(nominalAmount)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Detailed view — expandable */}
                  {showDetails && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="text-xs text-slate-500">Kas sebelum → sesudah</span>
                        <span className="text-xs font-medium">
                          {formatRupiah(cashBalanceBefore)} → <span className={cn("font-bold", totalCashFlow > 0 ? "text-emerald-600" : totalCashFlow < 0 ? "text-red-600" : "text-slate-700")}>{formatRupiah(cashBalanceAfter)}</span>
                        </span>
                      </div>
                      {sel.bankEffect !== "none" && selectedBank && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <span className="text-xs text-slate-500">{selectedBank.name} sebelum → sesudah</span>
                          <span className="text-xs font-medium">
                            {formatRupiah(bankBalanceBefore)} → <span className={cn("font-bold", sel.bankEffect === "in" ? "text-emerald-600" : "text-red-600")}>{formatRupiah(bankBalanceAfter)}</span>
                          </span>
                        </div>
                      )}
                      {/* Admin detail — hidden from cashier, shown in details */}
                      {adminFee > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50">
                          <span className="text-xs text-emerald-600">Fee method</span>
                          <span className="text-xs font-medium text-emerald-700">{FEE_METHOD_LABELS[form.feeMethod]}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reference number for external provider */}
                {flowConfig.involvesExternalProvider && (
                  <Input
                    label="No. Referensi Provider (opsional)"
                    value={form.referenceNo}
                    onChange={e => setForm({ ...form, referenceNo: e.target.value })}
                    placeholder="Contoh: TRX12345678 dari M-Banking"
                  />
                )}

                {/* Notes */}
                <Input label="Catatan (opsional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan..." />

                <div className="flex gap-3">
                  <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep("input")}>Kembali</Button>
                  <Button
                    variant="primary"
                    size="lg"
                    className={cn("flex-1", toneClasses.button)}
                    onClick={() => setStep("confirm")}
                  >
                    {flowConfig.primaryActionText.replace("{amount}", formatRupiah(physicalCashAmount))}
                  </Button>
                </div>
              </div>
            )}

            {/* ══════ STEP 3: CONFIRM ══════ */}
            {step === "confirm" && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  {flowConfig.tone === "warning" ? <TrendingDown size={28} className="text-amber-600" /> : <TrendingUp size={28} className="text-emerald-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">{flowConfig.confirmationHeading}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {flowConfig.confirmationBody
                      .replace("{amount}", formatRupiah(physicalCashAmount))
                      .replace("{account}", form.customerPhone || "—")}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">{flowConfig.cashSummaryLabel}</span><span className="font-bold">{formatRupiah(physicalCashAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Kas setelah transaksi</span><span className={cn("font-bold", totalCashFlow < 0 ? "text-red-600" : "text-emerald-600")}>{formatRupiah(cashBalanceAfter)}</span></div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep("review")}>{flowConfig.confirmationCancelText}</Button>
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
          </div>
        )}
      </Modal>

      {/* Success */}
      <Modal open={showDone} onClose={() => setShowDone(false)} size="sm">
        <div className="p-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800">Pencatatan Berhasil</h3>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400">No. Invoice</p>
            <p className="font-mono font-bold text-lg text-primary">{lastInv}</p>
          </div>
          {flowConfig?.involvesExternalProvider ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-semibold">Penting:</p>
              <p>Pencatatan lokal berhasil. Pastikan transfer/pembayaran ke provider sudah dilakukan via M-Banking/EDC.</p>
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
