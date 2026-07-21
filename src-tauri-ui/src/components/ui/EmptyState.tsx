import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function EmptyState({
  title,
  description,
  compact = false,
  children,
}: {
  title: string;
  description?: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <div role="status" className={cn("grid place-items-center gap-1.5 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4.5 py-8 text-center text-slate-500", compact && "p-4.5")}>
      <strong className="text-slate-900">{title}</strong>
      {description && <span>{description}</span>}
      {children}
    </div>
  );
}
