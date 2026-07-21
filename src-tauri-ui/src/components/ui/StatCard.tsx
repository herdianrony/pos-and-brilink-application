import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

const toneClass = {
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-cyan-50 text-cyan-700",
  amber: "bg-amber-50 text-amber-600",
  teal: "bg-teal-50 text-teal-700", 
};

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "green",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,.06)]">
      <span className={cn("grid h-12 w-12 place-items-center rounded-2xl text-lg font-black", toneClass[tone])}>{icon}</span>
      <div>
        <small className="font-black uppercase tracking-wider text-slate-400">{label}</small>
        <strong className="block text-xl font-black text-slate-950">{value}</strong>
        {sub && <p className="m-0 text-xs font-semibold text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
