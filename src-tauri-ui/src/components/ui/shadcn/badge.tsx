import * as React from "react"
import { cn } from "@/lib/cn"

type BadgeVariant =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "primary"
  | "purple"
  | "secondary"
  | "destructive"
  | "outline";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-200/60",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  primary: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  secondary: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60",
  purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60",
  destructive: "bg-red-100 text-red-700",
  outline: "text-slate-700 border border-slate-200",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge, type BadgeVariant };
