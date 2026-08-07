import * as React from "react";
import { cn } from "../../lib/cn";
import { Input as ShadcnInput } from "./shadcn/input";
import { Label } from "./shadcn/label";
import * as SelectPrimitive from "@radix-ui/react-select";

/* ── Backward-compatible Input with label prop ── */
export function Input({
  label,
  className,
  ...props
}: {
  label?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <ShadcnInput className={className} {...props} />
    </div>
  );
}

/* ── Backward-compatible native Select with label prop ── */
export function Select({
  label,
  children,
  className,
  ...props
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
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
