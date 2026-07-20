export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function paymentLabel(method: string) {
  if (method === "cash") return "Tunai";
  if (method === "transfer") return "Transfer";
  if (method === "qris") return "QRIS";
  if (method === "mixed") return "Campuran";
  return method;
}

export function mutationLabel(type: string) {
  const labels: Record<string, string> = {
    initial_balance: "Saldo Awal",
    adjustment: "Penyesuaian",
    pos_in: "POS Tunai",
    pos_transfer_in: "POS Transfer",
    pos_qris_in: "POS QRIS",
    transfer_out: "Transfer Keluar",
    transfer_in: "Transfer Masuk",
    owner_draw: "Prive Owner",
    bank_fee: "Biaya Bank/MDR",
    agent_cash_effect: "Efek Kas Agen",
    agent_bank_effect: "Efek Rekening Agen",
  };
  return labels[type] || type;
}

export function parseCurrencyInput(value: string, allowNegative = false) {
  const negative = allowNegative && value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return negative ? "-" : "";
  return `${negative ? "-" : ""}${Number(digits)}`;
}
