import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "accent" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const variants: Record<ButtonVariant, string> = {
  primary:
    "gradient-primary text-white shadow-glow-primary hover:shadow-pop",
  secondary:
    "bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-soft",
  danger:
    "bg-red-500 text-white hover:bg-red-600 shadow-pop",
  success:
    "gradient-primary text-white shadow-glow-primary",
  accent:
    "gradient-accent text-white shadow-glow-accent",
  ghost:
    "text-slate-600 hover:bg-slate-100",
  outline:
    "bg-transparent text-primary border-2 border-primary hover:bg-primary/5",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs rounded-xl",
  md: "px-5 py-2.5 text-sm rounded-2xl",
  lg: "px-6 py-3.5 text-base rounded-2xl",
  xl: "px-8 py-4 text-lg rounded-2xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode }) {
  return (
    <button
      className={cn(
        "font-bold transition-all duration-200 active:scale-[0.96] hover:scale-[1.02]",
        "disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 disabled:hover:scale-100",
        "inline-flex items-center justify-center gap-2",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}