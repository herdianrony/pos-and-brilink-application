import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type TabItem<T extends string> = {
  id: T;
  label: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
};

/** Matches Electron Tabs: slate-100/80 pill, active=white+shadow-pop */
export function Tabs<T extends string>({
  items,
  active,
  onChange,
  className,
  ariaLabel = "Navigasi tab",
}: {
  items: Array<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
              selected
                ? "bg-white text-primary shadow-pop"
                : "text-slate-500 hover:text-slate-700",
            )}
            onClick={() => onChange(item.id)}
          >
            {Icon && <Icon size={16} aria-hidden />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Chip-style tabs for compact filters */
export function ChipTabs<T extends string>({
  items,
  active,
  onChange,
  className,
  ariaLabel = "Filter",
}: {
  items: Array<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex gap-2", className)}
    >
      {items.map((item) => {
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              selected
                ? "bg-primary text-white shadow-card shadow-primary/20"
                : "bg-white text-slate-600 border border-slate-200 hover:border-primary/30",
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}