import {
  BarChart3,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  ScrollText,
  Search,
  Settings,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "../types";

const iconMap: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  brilink: Landmark,
  products: Package,
  history: ClipboardList,
  debts: ReceiptText,
  rekeningKoran: ScrollText,
  cash: Wallet,
  reports: BarChart3,
  logs: FileText,
  settings: Settings,
  search: Search,
};

export function Icon({ name }: { name: IconName }) {
  const LucideIcon = iconMap[name] || Search;
  return <LucideIcon size={20} strokeWidth={2.2} aria-hidden />;
}
