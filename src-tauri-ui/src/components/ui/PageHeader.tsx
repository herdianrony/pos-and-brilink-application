import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-center justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        {description && <p className="m-0 text-sm font-semibold text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2.5">{actions}</div>}
    </div>
  );
}
