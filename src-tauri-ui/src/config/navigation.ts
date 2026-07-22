import type { IconName, ViewKey } from "../types";

export const navItems: Array<{ id: ViewKey; label: string; icon: IconName; adminOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "pos", label: "Kasir POS", icon: "pos" },
  { id: "brilink", label: "Layanan Agen", icon: "brilink" },
  { id: "products", label: "Produk", icon: "products", adminOnly: true },
  { id: "history", label: "Transaksi", icon: "history" },
  { id: "statement", label: "Rekening Koran", icon: "statement", adminOnly: true },
  { id: "cash", label: "Kas & Saldo", icon: "cash", adminOnly: true },
  { id: "settings", label: "Pengaturan", icon: "settings", adminOnly: true },
];