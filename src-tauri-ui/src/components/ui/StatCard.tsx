import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-red-500"
        : "text-slate-400";
  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-card hover:shadow-pop hover:border-slate-300/60 transition-all duration-300 p-5 animate-fadeIn group">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300",
            color,
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 truncate">
            {value}
          </p>
          {sub && (
            <p
              className={cn(
                "text-xs mt-1 font-semibold",
                trend ? trendColor : "text-slate-400",
              )}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}