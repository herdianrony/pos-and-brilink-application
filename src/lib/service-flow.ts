/**
 * Service Transaction Flow Configuration
 *
 * Determines UI/UX behavior based on the transaction flow type.
 * Each flow type has different:
 *   - Title and subtitle copy
 *   - Cash/bank account selection label (context-specific)
 *   - Primary action button text
 *   - Confirmation dialog copy (physical cash verification)
 *   - Color tone (warning for withdrawal, success for deposit, etc.)
 *   - Fee method options
 *   - Denomination input visibility (for deposits)
 */

export type FlowType =
  | "cash_withdrawal"
  | "cash_deposit"
  | "transfer"
  | "payment"
  | "topup"
  | "inquiry";

export type FlowTone = "warning" | "success" | "info" | "primary";

export type FeeMethod =
  | "cash"        // Dibayar tunai oleh nasabah
  | "deducted"    // Dipotong dari nominal
  | "charged";    // Dibebankan dari rekening nasabah

export interface FlowConfig {
  flowType: FlowType;
  title: string;
  subtitle: string;
  /** Label for the cash/bank account selector */
  accountSelectorLabel: string;
  /** Badge shown in header indicating cash direction */
  cashBadgeText: string;
  cashBadgeTone: "warning" | "success" | "info";
  /** Label for the physical cash summary row */
  cashSummaryLabel: string;
  /** Primary action button text (with {amount} placeholder) */
  primaryActionText: string;
  /** Confirmation dialog heading */
  confirmationHeading: string;
  /** Confirmation dialog body */
  confirmationBody: string;
  /** Confirm button text in confirmation dialog */
  confirmationConfirmText: string;
  /** Cancel button text in confirmation dialog */
  confirmationCancelText: string;
  /** Color tone for the modal accent */
  tone: FlowTone;
  /** Whether to show denomination breakdown input */
  showDenomination: boolean;
  /** Whether fee method selection is shown */
  showFeeMethod: boolean;
  /** Allowed fee methods for this flow */
  allowedFeeMethods: FeeMethod[];
  /** S-04: Whether this flow requires a nominal amount (inquiry doesn't) */
  requiresNominal: boolean;
  /** S-04: Whether this flow involves physical cash handling */
  requiresCashHandling: boolean;
  /** S-07: Whether this flow involves external provider (show "pencatatan" wording) */
  involvesExternalProvider: boolean;
}

const FLOW_CONFIGS: Record<FlowType, FlowConfig> = {
  // ── Tarik Tunai ─────────────────────────────────
  cash_withdrawal: {
    flowType: "cash_withdrawal",
    title: "Tarik Tunai",
    subtitle: "Kas keluar ke nasabah",
    accountSelectorLabel: "Sumber Saldo / Float Agen",
    cashBadgeText: "↓ Kas akan berkurang",
    cashBadgeTone: "warning",
    cashSummaryLabel: "Tunai diserahkan ke nasabah",
    primaryActionText: "Serahkan {amount} & Proses",
    confirmationHeading: "Konfirmasi Penyerahan Tunai",
    confirmationBody:
      "Apakah uang tunai {amount} sudah diserahkan kepada nasabah? Pastikan nominal dihitung dengan benar di hadapan nasabah.",
    confirmationConfirmText: "Ya, Uang Sudah Diserahkan",
    confirmationCancelText: "Belum, Kembali",
    tone: "warning",
    showDenomination: false,
    showFeeMethod: true,
    allowedFeeMethods: ["cash", "deducted", "charged"],
    requiresNominal: true,
    requiresCashHandling: true,
    involvesExternalProvider: false,
  },

  // ── Setor Tunai ─────────────────────────────────
  cash_deposit: {
    flowType: "cash_deposit",
    title: "Setor Tunai",
    subtitle: "Kas masuk dari nasabah",
    accountSelectorLabel: "Rekening Settlement Agen",
    cashBadgeText: "↑ Kas akan bertambah",
    cashBadgeTone: "success",
    cashSummaryLabel: "Tunai diterima dari nasabah",
    primaryActionText: "Terima {amount} & Proses",
    confirmationHeading: "Konfirmasi Penerimaan Tunai",
    confirmationBody:
      "Pastikan uang fisik sudah diterima dan dihitung. Rekening tujuan: {account}. Nominal: {amount}.",
    confirmationConfirmText: "Uang Sudah Diterima",
    confirmationCancelText: "Periksa Kembali",
    tone: "success",
    showDenomination: true,
    showFeeMethod: true,
    allowedFeeMethods: ["cash", "charged"],
    requiresNominal: true,
    requiresCashHandling: true,
    involvesExternalProvider: false,
  },

  // ── Transfer (Kirim Transfer Tunai) ─────────────
  // S-01: Transfer = nasabah bayar tunai, agen kirim transfer dari rekening
  transfer: {
    flowType: "transfer",
    title: "Kirim Transfer",
    subtitle: "Nasabah membayar tunai, agen mengirim dana ke rekening tujuan",
    accountSelectorLabel: "Rekening Pengirim Agen",
    cashBadgeText: "↑ Kas masuk, ↓ Rekening keluar",
    cashBadgeTone: "info",
    cashSummaryLabel: "Tunai diterima dari nasabah",
    primaryActionText: "Proses Transfer {amount}",
    confirmationHeading: "Konfirmasi Kirim Transfer",
    confirmationBody:
      "Pastikan detail transfer sudah benar. Nominal: {amount}. Transfer harus dilakukan manual via M-Banking/EDC. Catat nomor referensi setelah selesai.",
    confirmationConfirmText: "Transfer Sudah Dikirim",
    confirmationCancelText: "Periksa Kembali",
    tone: "info",
    showDenomination: false,
    showFeeMethod: true,
    allowedFeeMethods: ["cash", "deducted", "charged"],
    requiresNominal: true,
    requiresCashHandling: true,
    involvesExternalProvider: true,
  },

  // ── Pembayaran Tagihan ──────────────────────────
  payment: {
    flowType: "payment",
    title: "Pembayaran Tagihan",
    subtitle: "Bayar tagihan nasabah",
    accountSelectorLabel: "Rekening Pembayaran Agen",
    cashBadgeText: "↓ Kas/bank untuk bayar tagihan",
    cashBadgeTone: "info",
    cashSummaryLabel: "Nominal dibayar",
    primaryActionText: "Bayar {amount} & Proses",
    confirmationHeading: "Konfirmasi Pembayaran",
    confirmationBody:
      "Pastikan nominal tagihan sudah benar. Nominal: {amount}. Pembayaran ke provider harus dilakukan manual. Catat nomor referensi setelah selesai.",
    confirmationConfirmText: "Pembayaran Sudah Dilakukan",
    confirmationCancelText: "Periksa Kembali",
    tone: "primary",
    showDenomination: false,
    showFeeMethod: true,
    allowedFeeMethods: ["cash", "charged"],
    requiresNominal: true,
    requiresCashHandling: true,
    involvesExternalProvider: true,
  },

  // ── Top Up (Pulsa/Game/E-Wallet) ────────────────
  topup: {
    flowType: "topup",
    title: "Top Up",
    subtitle: "Isi pulsa / paket data / e-wallet",
    accountSelectorLabel: "Rekening Sumber Dana",
    cashBadgeText: "↓ Kas/bank untuk top up",
    cashBadgeTone: "info",
    cashSummaryLabel: "Nominal top up",
    primaryActionText: "Top Up {amount} & Proses",
    confirmationHeading: "Konfirmasi Top Up",
    confirmationBody:
      "Pastikan nomor tujuan sudah benar. Nominal: {amount}. Top up ke provider harus dilakukan manual. Catat nomor referensi setelah selesai.",
    confirmationConfirmText: "Top Up Sudah Dilakukan",
    confirmationCancelText: "Periksa Kembali",
    tone: "primary",
    showDenomination: false,
    showFeeMethod: true,
    allowedFeeMethods: ["cash", "charged"],
    requiresNominal: true,
    requiresCashHandling: true,
    involvesExternalProvider: true,
  },

  // ── Inquiry (Cek Saldo) ─────────────────────────
  // S-04: Inquiry flow — no nominal, no fee, no cash handling
  inquiry: {
    flowType: "inquiry",
    title: "Cek Saldo / Inquiry",
    subtitle: "Cek informasi tanpa transaksi finansial",
    accountSelectorLabel: "Rekening untuk Inquiry",
    cashBadgeText: "ℹ Tidak ada perubahan kas",
    cashBadgeTone: "info",
    cashSummaryLabel: "Tidak ada uang fisik",
    primaryActionText: "Catat Inquiry",
    confirmationHeading: "Konfirmasi Pencatatan Inquiry",
    confirmationBody:
      "Pencatatan inquiry akan disimpan tanpa perubahan saldo. Tidak ada uang fisik yang berpindah.",
    confirmationConfirmText: "Catat Inquiry",
    confirmationCancelText: "Batal",
    tone: "primary",
    showDenomination: false,
    showFeeMethod: false,
    allowedFeeMethods: [],
    requiresNominal: false,
    requiresCashHandling: false,
    involvesExternalProvider: false,
  },
};

/**
 * Determine flow type from service data.
 * Uses cashEffect/bankEffect + service name/category to infer the flow type.
 *
 * Order matters: keyword checks come first (more specific), then
 * cashEffect/bankEffect pattern matching as fallback.
 */
export function getFlowType(service: {
  cashEffect: string;
  bankEffect: string;
  name: string;
  categoryName?: string | null;
}): FlowType {
  const name = service.name.toLowerCase();
  const cat = (service.categoryName || "").toLowerCase();

  // ── 1. Keyword-based detection (more specific) ──

  // Cash withdrawal: "tarik tunai", "penarikan"
  if (name.includes("tarik tunai") || name.includes("penarikan") || cat.includes("penarikan")) {
    return "cash_withdrawal";
  }

  // Cash deposit: "setor tunai", "setor"
  if (name.includes("setor tunai") || name.includes("setor") || cat.includes("setor")) {
    return "cash_deposit";
  }

  // Transfer
  if (name.includes("transfer") || cat.includes("transfer")) {
    return "transfer";
  }

  // Top up (pulsa, game, e-wallet) — check before payment since names are specific
  if (
    name.includes("pulsa") ||
    name.includes("paket data") ||
    name.includes("top up") ||
    name.includes("topup") ||
    name.includes("voucher game") ||
    cat.includes("pulsa") ||
    cat.includes("voucher")
  ) {
    return "topup";
  }

  // Payment (tagihan, cicilan, pln, pdam, telkom, bpjs, token)
  if (
    name.includes("tagihan") ||
    name.includes("cicilan") ||
    name.includes("pln") ||
    name.includes("pdam") ||
    name.includes("telkom") ||
    name.includes("indihome") ||
    name.includes("bpjs") ||
    name.includes("token") ||
    cat.includes("pembayaran") ||
    cat.includes("cicilan") ||
    cat.includes("token")
  ) {
    return "payment";
  }

  // ── 2. Fallback: infer from cashEffect/bankEffect ──
  if (service.cashEffect === "out" && service.bankEffect === "none") {
    return "cash_withdrawal";
  }
  if (service.cashEffect === "in" && service.bankEffect === "out") {
    return "cash_deposit";
  }

  // Default: payment flow
  return "payment";
}

export function getFlowConfig(service: {
  cashEffect: string;
  bankEffect: string;
  name: string;
  categoryName?: string | null;
  flowType?: string | null;
}): FlowConfig {
  // S-04: Prefer explicit flowType from DB if available
  if (service.flowType && service.flowType in FLOW_CONFIGS) {
    return FLOW_CONFIGS[service.flowType as FlowType];
  }
  // Fallback: infer from name/category/cashEffect/bankEffect
  const flowType = getFlowType(service);
  return FLOW_CONFIGS[flowType];
}

// ── Fee method labels ─────────────────────────────
export const FEE_METHOD_LABELS: Record<FeeMethod, string> = {
  cash: "Dibayar tunai oleh nasabah",
  deducted: "Dipotong dari nominal transaksi",
  charged: "Dibebankan dari rekening nasabah",
};

// ── S-02: Single source of truth for cash flow calculation ──
// Used by both UI preview and backend ledger to ensure consistency.
//
// cashReceived: uang fisik yang diterima agen dari nasabah
// cashDispensed: uang fisik yang diserahkan agen ke nasabah
// cashDelta: perubahan kas (cashReceived - cashDispensed), positif = kas naik
export interface CashFlowResult {
  cashReceived: number;
  cashDispensed: number;
  cashDelta: number;
  /** Total yang harus diserahkan/diterima secara fisik (untuk CTA/confirmation) */
  physicalCashAmount: number;
}

export interface BankFlowResult {
  bankDelta: number;
  bankMutationAmount: number;
}

export function calculateBankFlow(
  cashEffect: string,
  bankEffect: string,
  nominal: number,
  fee: number,
  feeMethod: FeeMethod
): BankFlowResult {
  if (bankEffect === "none") {
    return { bankDelta: 0, bankMutationAmount: 0 };
  }

  let amount = nominal;

  // Tarik Tunai skenario umum:
  // nasabah transfer nominal + admin ke rekening agen, agen menyerahkan cash nominal.
  if (cashEffect === "out" && bankEffect === "in" && feeMethod === "charged") {
    amount = nominal + fee;
  }

  const bankDelta = bankEffect === "in" ? amount : -amount;
  return { bankDelta, bankMutationAmount: bankDelta };
}

export function calculateCashFlow(
  cashEffect: string,
  nominal: number,
  fee: number,
  feeMethod: FeeMethod
): CashFlowResult {
  const cashReceived = cashEffect === "in"
    ? nominal + (feeMethod === "cash" ? fee : 0)
    : 0;

  // S-02: For withdrawal with deducted fee, nasabah receives nominal - fee
  const cashDispensed = cashEffect === "out"
    ? (feeMethod === "deducted" ? Math.max(0, nominal - fee) : nominal)
    : 0;

  const cashDelta = cashReceived - cashDispensed;

  // Physical cash amount for CTA: what kasir actually hands over or receives
  const physicalCashAmount = cashEffect === "out"
    ? cashDispensed
    : cashReceived;

  return { cashReceived, cashDispensed, cashDelta, physicalCashAmount };
}

// ── Tone color classes ────────────────────────────
export function getToneClasses(tone: FlowTone) {
  switch (tone) {
    case "warning":
      return {
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        accent: "text-amber-600",
        cardBorder: "border-amber-200",
        cardBg: "bg-amber-50",
        button: "bg-amber-500 hover:bg-amber-600 text-white",
        summaryBorder: "border-amber-200",
        summaryBg: "from-amber-50 to-orange-50",
      };
    case "success":
      return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        accent: "text-emerald-600",
        cardBorder: "border-emerald-200",
        cardBg: "bg-emerald-50",
        button: "bg-emerald-500 hover:bg-emerald-600 text-white",
        summaryBorder: "border-emerald-200",
        summaryBg: "from-emerald-50 to-green-50",
      };
    case "info":
      return {
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        accent: "text-blue-600",
        cardBorder: "border-blue-200",
        cardBg: "bg-blue-50",
        button: "bg-blue-500 hover:bg-blue-600 text-white",
        summaryBorder: "border-blue-200",
        summaryBg: "from-blue-50 to-cyan-50",
      };
    case "primary":
    default:
      return {
        badge: "bg-purple-100 text-purple-700 border-purple-200",
        accent: "text-purple-600",
        cardBorder: "border-purple-200",
        cardBg: "bg-purple-50",
        button: "bg-purple-500 hover:bg-purple-600 text-white",
        summaryBorder: "border-purple-200",
        summaryBg: "from-purple-50 to-blue-50",
      };
  }
}
