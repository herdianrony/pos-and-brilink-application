"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "./DynamicIcon";

// ── Modal ─────────────────────────────────────────
export function Modal({ open, onClose, children, size = "md" }: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const w = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md animate-fadeIn" />
      <div className={`relative bg-white rounded-3xl shadow-2xl w-full ${w} max-h-[90vh] overflow-y-auto animate-scaleIn border border-zinc-200/60`}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────
export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-zinc-200/70 shadow-soft",
      "hover:shadow-card hover:border-zinc-300/70",
      "transition-all duration-300",
      className
    )} {...props}>
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────
export function Badge({ children, variant = "default" }: {
  children: ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "primary" | "purple";
}) {
  const colors = {
    default: "bg-zinc-100 text-zinc-700",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200/60",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
    primary: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
    purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────
export function Button({ children, variant = "primary", size = "md", className, disabled, ...props }: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-light shadow-glow-primary hover:shadow-lg",
    secondary: "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-soft",
    ghost: "text-zinc-600 hover:bg-zinc-100",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20",
    accent: "bg-gradient-to-r from-accent to-accent-light text-white shadow-glow-accent hover:shadow-lg",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  };
  return (
    <button
      className={cn(
        "font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 inline-flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────
export function Input({ label, className, ...props }: {
  label?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-zinc-700">{label}</label>}
      <input
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50",
          "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
          "transition-all text-sm placeholder:text-zinc-400",
          className
        )}
        {...props}
      />
    </div>
  );
}

// ── Select ────────────────────────────────────────
export function Select({ label, children, className, ...props }: {
  label?: string;
  children: ReactNode;
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-zinc-700">{label}</label>}
      <select
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50",
          "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
          "transition-all text-sm",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Empty State ───────────────────────────────────
export function EmptyState({ icon, title, subtitle }: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
      <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
        <DynamicIcon name={icon} fallback="package" size={28} className="text-zinc-400" />
      </div>
      <p className="font-semibold text-zinc-600">{title}</p>
      {subtitle && <p className="text-sm mt-1 text-zinc-400">{subtitle}</p>}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" }[size];
  return (
    <div className="flex items-center justify-center py-12">
      <div className={`${s} border-[3px] border-primary/20 border-t-primary rounded-full animate-spin`} />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────
export function StatCard({ icon, label, value, sub, color, trend }: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-zinc-400";
  return (
    <Card className="p-5 animate-fadeIn group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-zinc-900 mt-0.5 truncate">{value}</p>
          {sub && <p className={`text-xs mt-0.5 ${trend ? trendColor : "text-zinc-400"}`}>{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

// ── Section Title ─────────────────────────────────
export function SectionTitle({ icon, title, desc, action }: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-glow-primary shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
          {desc && <p className="text-sm text-zinc-400">{desc}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: {
  tabs: Array<{ id: string; label: string; icon?: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-zinc-100/80 p-1 rounded-xl overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
            active === t.id
              ? "bg-white text-primary shadow-soft"
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          {t.icon && <DynamicIcon name={t.icon} fallback="package" size={14} className="inline-block" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}
