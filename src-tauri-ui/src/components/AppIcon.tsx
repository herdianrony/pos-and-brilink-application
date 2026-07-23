import {
  Landmark,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Wallet,
  ClipboardList,
  ScrollText,
  ReceiptText,
  BarChart3,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "../types";

const iconMap: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  brilink: Landmark,
  products: Package,
  history: ClipboardList,
  statement: ScrollText,
  cash: Wallet,
  keuangan: Wallet,
  settings: Settings,
  search: Search,
  debts: ReceiptText,
  reports: BarChart3,
  logs: Activity,
};

export function Icon({ name }: { name: IconName }) {
  const LucideIcon = iconMap[name] || Search;
  return <LucideIcon size={20} strokeWidth={2.2} aria-hidden />;
}