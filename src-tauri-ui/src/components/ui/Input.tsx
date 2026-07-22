import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Input({
  label,
  className,
  ...props
}: {
  label?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-bold text-slate-700">{label}</label>
      )}
      <input
        className={cn(
          "w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50",
          "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
          "transition-all text-sm font-medium placeholder:text-slate-400",
          "hover:border-slate-300",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Select({
  label,
  children,
  className,
  ...props
}: {
  label?: string;
  children: ReactNode;
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-bold text-slate-700">{label}</label>
      )}
      <select
        className={cn(
          "w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50",
          "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
          "transition-all text-sm font-medium cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}