import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function SectionTitle({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-primary shrink-0"
            style={{ backgroundColor: "#00875A" }}
          >
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
          {desc && (
            <p className="text-sm text-slate-400 font-semibold">{desc}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}