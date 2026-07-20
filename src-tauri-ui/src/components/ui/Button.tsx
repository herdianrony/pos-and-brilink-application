import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-gradient-to-br from-emerald-700 to-emerald-400 text-white shadow-[0_10px_24px_rgba(0,135,90,.18)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,135,90,.26)]",
  secondary:
    "border border-slate-200 bg-slate-100 text-slate-900 shadow-none hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-[0_8px_20px_rgba(15,23,42,.10)]",
  danger:
    "border-0 bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-[0_10px_24px_rgba(220,38,38,.20)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(220,38,38,.26)]",
  ghost:
    "border-0 bg-transparent text-slate-500 shadow-none hover:bg-slate-100 hover:text-slate-700",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; children: ReactNode }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
