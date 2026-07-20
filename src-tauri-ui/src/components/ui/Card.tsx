import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200/90 bg-white/95 p-5.5 shadow-[0_10px_30px_rgba(15,23,42,.06)] backdrop-blur",
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
    <div className={cn("mb-4 flex items-start justify-between gap-3.5", className)} {...props}>
      {children}
    </div>
  );
}
