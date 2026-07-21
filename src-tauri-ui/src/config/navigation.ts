import type { IconName, ViewKey } from "../types";

export const navItems: Array<{ id: ViewKey; label: string; icon: IconName; adminOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "pos", label: "Kasir POS", icon: "pos" },
  { id: "brilink", label: "Layanan Agen", icon: "brilink" },
  { id: "products", label: "Produk", icon: "products", adminOnly: true },
  { id: "finance", label: "Keuangan", icon: "finance" },
  { id: "settings", label: "Pengaturan", icon: "settings", adminOnly: true },
];
