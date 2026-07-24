import { Children, isValidElement } from "react";
import type { KeyboardEvent, ReactNode, TdHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

function columnWidthFromTemplate(template: string) {
  return template
    .split(/\s+/)
    .map((part) => {
      if (/^\d+(px|rem|%)$/.test(part)) return part;
      return undefined;
    });
}

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
  const widths = columnWidthFromTemplate(template);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/70">
      <table className="w-full border-separate border-spacing-0 text-left text-sm" style={{ minWidth }}>
        <colgroup>
          {columns.map((_, index) => <col key={index} style={widths[index] ? { width: widths[index] } : undefined} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function DataRow({
  active = false,
  onClick,
  children,
}: {
  template: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <tr
      className={cn(
        "group text-slate-900 transition-colors",
        onClick && "cursor-pointer hover:bg-emerald-50/40 focus:outline-none focus-visible:bg-emerald-50/60",
        active && "bg-emerald-50",
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      aria-selected={active || undefined}
    >
      {Children.map(children, (child) => {
        if (isValidElement(child) && child.type === DataCell) {
          return child;
        }
        return <DataCell>{child}</DataCell>;
      })}
    </tr>
  );
}

export function DataCell({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { children: ReactNode }) {
  return (
    <td className={cn("min-w-0 px-4 py-3 align-middle first:rounded-l-2xl last:rounded-r-2xl", className)} {...props}>
      <span className="grid min-w-0 gap-1">{children}</span>
    </td>
  );
}

export function DataCellText({ children }: { children: ReactNode }) {
  return <small className="text-xs text-slate-500">{children}</small>;
}
