import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Badge({
  tone = "success",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "success" | "warning" | "info" | "danger"; children: ReactNode }) {
  const toneClass = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    info: "bg-indigo-50 text-indigo-700",
    danger: "bg-red-50 text-red-600",
  }[tone];
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-black", toneClass, className)} {...props}>
      {children}
    </span>
  );
}
