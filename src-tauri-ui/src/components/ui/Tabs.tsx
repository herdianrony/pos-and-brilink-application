import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type TabItem<T extends string> = {
  id: T;
  label: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
};

export function Tabs<T extends string>({
  items,
  active,
  onChange,
  className,
  buttonClassName,
  ariaLabel = "Navigasi tab",
}: {
  items: Array<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "mb-4 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_8px_22px_rgba(15,23,42,.05)]",
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
              "flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 shadow-none transition-colors hover:translate-y-0 hover:bg-slate-100 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50",
              selected && "bg-emerald-500 text-white hover:bg-emerald-500",
              buttonClassName,
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
    <div role="tablist" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
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
              "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 shadow-none transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50",
              selected && "border-transparent bg-gradient-to-br from-emerald-700 to-emerald-500 text-white hover:bg-emerald-600",
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
