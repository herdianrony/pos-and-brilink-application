import {
  Landmark,
  LayoutDashboard,
  Search,
  Settings,
  ShoppingCart,
  Wallet,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "../types";

const iconMap: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  brilink: Landmark,
  history: ClipboardList,
  cash: Wallet,
  finance: Wallet,
  settings: Settings,
  search: Search,
};

export function Icon({ name }: { name: IconName }) {
  const LucideIcon = iconMap[name] || Search;
  return <LucideIcon size={20} strokeWidth={2.2} aria-hidden />;
}