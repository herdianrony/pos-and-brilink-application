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
  settings: Settings,
  search: Search,
};

export function Icon({ name }: { name: IconName }) {
  const LucideIcon = iconMap[name] || Search;
  return <LucideIcon size={20} strokeWidth={2.2} aria-hidden />;
}