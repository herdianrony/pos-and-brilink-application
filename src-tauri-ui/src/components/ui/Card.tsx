import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "bg-white rounded-3xl border border-slate-200/60 shadow-card",
        "hover:shadow-pop hover:border-slate-300/60",
        "transition-all duration-300",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("p-5 border-b border-slate-100", className)} {...props}>
      {children}
    </div>
  );
}
