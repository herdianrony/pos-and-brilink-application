import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function DataTable({
  columns,
  template,
  minWidth = 720,
  children,
}: {
  columns: ReactNode[];
  template: string;
  minWidth?: number;
  children: ReactNode;
}) {
  const style = { gridTemplateColumns: template } satisfies CSSProperties;
  return (
    <div className="overflow-x-auto">
      <div className="grid gap-2" style={{ minWidth }}>
        <div className="grid gap-3 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-400" style={style}>
          {columns.map((column, index) => <span key={index}>{column}</span>)}
        </div>
        {children}
      </div>
    </div>
  );
}

export function DataRow({
  template,
  active = false,
  onClick,
  children,
}: {
  template: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = cn(
    "grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-900 shadow-none transition-colors hover:border-emerald-200 hover:bg-emerald-50/20",
    active && "border-emerald-400 bg-emerald-50",
  );
  const style = { gridTemplateColumns: template } satisfies CSSProperties;

  if (onClick) {
    return <button className={className} style={style} onClick={onClick}>{children}</button>;
  }
  return <div className={className} style={style}>{children}</div>;
}

export function DataCell({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("grid gap-1 min-w-0", className)}>{children}</span>;
}

export function DataCellText({ children }: { children: ReactNode }) {
  return <small className="text-xs text-slate-500">{children}</small>;
}
