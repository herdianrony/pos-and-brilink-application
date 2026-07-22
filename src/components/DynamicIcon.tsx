"use client";

import type { LucideProps, LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  Book,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  Coins,
  Cookie,
  CreditCard,
  CupSoda,
  Diamond,
  DollarSign,
  Droplet,
  FileText,
  Folder,
  FolderOpen,
  Gamepad2,
  Gift,
  Globe,
  Heart,
  HeartPulse,
  HelpCircle,
  Home,
  Info,
  Landmark,
  Lightbulb,
  MapPin,
  Milk,
  Music,
  Package,
  Pencil,
  Phone,
  PiggyBank,
  Pill,
  Receipt,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Signal,
  Smartphone,
  Snowflake,
  Sparkles,
  SprayCan,
  Star,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Utensils,
  Wallet,
  Wheat,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";

// ── Icon Map ──────────────────────────────────────
// Hanya icon yang benar-benar dipakai di codebase (rendering, fallback, picker).
// Untuk tambah icon baru, tambahkan entry di sini DAN di AVAILABLE_ICONS.
const ICON_MAP: Record<string, LucideIcon> = {
  "alert-triangle": AlertTriangle,
  "arrow-down-left": ArrowDownLeft,
  "arrow-up-right": ArrowUpRight,
  banknote: Banknote,
  "bar-chart-3": BarChart3,
  bell: Bell,
  book: Book,
  briefcase: Briefcase,
  building: Building2,
  "building-2": Building2,
  calculator: Calculator,
  calendar: Calendar,
  camera: Camera,
  cash: Banknote,
  "check-circle": CheckCircle2,
  "check-circle-2": CheckCircle2,
  circle: Circle,
  clock: Clock,
  coins: Coins,
  cookie: Cookie,
  "credit-card": CreditCard,
  "cup-soda": CupSoda,
  diamond: Diamond,
  "dollar-sign": DollarSign,
  droplet: Droplet,
  "file-text": FileText,
  folder: Folder,
  "folder-open": FolderOpen,
  "gamepad-2": Gamepad2,
  gift: Gift,
  globe: Globe,
  heart: Heart,
  "heart-pulse": HeartPulse,
  "help-circle": HelpCircle,
  home: Home,
  info: Info,
  landmark: Landmark,
  lightbulb: Lightbulb,
  "map-pin": MapPin,
  milk: Milk,
  music: Music,
  package: Package,
  pencil: Pencil,
  phone: Phone,
  "piggy-bank": PiggyBank,
  pill: Pill,
  receipt: Receipt,
  "refresh-cw": RefreshCw,
  rocket: Rocket,
  search: Search,
  settings: Settings,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  signal: Signal,
  smartphone: Smartphone,
  snowflake: Snowflake,
  sparkles: Sparkles,
  "spray-can": SprayCan,
  star: Star,
  tag: Tag,
  target: Target,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  user: User,
  users: Users,
  utensils: Utensils,
  wallet: Wallet,
  wheat: Wheat,
  wrench: Wrench,
  "x-circle": XCircle,
  zap: Zap,
  // Aliases
  bank: Landmark,
  money: Banknote,
  "party-popper": Sparkles, // Lucide doesn't have PartyPopper, use Sparkles
};

export interface DynamicIconProps extends Omit<LucideProps, "ref" | "name"> {
  name: string | null | undefined;
  fallback?: string;
}

/**
 * Render Lucide icon dari string name.
 *
 * Pemakaian:
 *   <DynamicIcon name="package" size={20} className="text-emerald-500" />
 *   <DynamicIcon name={category.icon} fallback="package" />
 *
 * Jika name tidak dikenal, gunakan fallback (default: "package").
 */
export function DynamicIcon({
  name,
  fallback = "package",
  ...props
}: DynamicIconProps) {
  const iconName = name && ICON_MAP[name] ? name : fallback;
  const Icon = ICON_MAP[iconName] || Package;
  return <Icon {...props} />;
}

/**
 * Daftar nama icon yang tersedia untuk dipilih di icon picker.
 * Hanya icon yang sudah ter-definisi di ICON_MAP.
 */
export const AVAILABLE_ICONS = Object.keys(ICON_MAP).filter(
  // Exclude aliases dari picker (jangan tampilkan duplikat)
  (name) => !["bank", "money", "party-popper", "cash", "check-circle", "building-2"].includes(name)
).sort();

export default DynamicIcon;
