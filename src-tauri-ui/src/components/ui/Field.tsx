import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Field({
  label,
  note,
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { label: string; note?: string; children: ReactNode }) {
  return (
    <label className={cn("grid gap-2 text-[13px] font-black text-slate-600", className)} {...props}>
      <span>{label}</span>
      {note && <span className="-mt-0.5 block text-xs font-semibold leading-snug text-slate-500">{note}</span>}
      {children}
    </label>
  );
}
