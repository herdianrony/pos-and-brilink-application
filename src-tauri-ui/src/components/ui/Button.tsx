import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-gradient-to-br from-emerald-700 to-teal-500 text-white shadow-[0_10px_24px_rgba(4,120,87,.18)]",
  secondary:
    "border border-slate-200 bg-slate-100 text-slate-900 shadow-none hover:bg-slate-200",
  danger:
    "border-0 bg-gradient-to-br from-rose-700 to-red-500 text-white shadow-[0_10px_24px_rgba(190,18,60,.20)]",
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
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
