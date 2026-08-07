import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/cn"

/* ── Custom variant types matching original POS design system ── */
type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "accent"
  | "ghost"
  | "outline"
  | "link"
  | "destructive";

type ButtonSize = "sm" | "md" | "lg" | "xl" | "default" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
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
  link:
    "text-primary underline-offset-4 hover:underline",
  destructive:
    "bg-red-500 text-white hover:bg-red-600 shadow-pop",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-10 px-5 py-2.5 text-sm rounded-2xl",
  sm: "h-9 px-4 py-2 text-xs rounded-xl",
  md: "h-11 px-5 py-2.5 text-sm rounded-2xl",
  lg: "h-12 px-6 py-3.5 text-base rounded-2xl",
  xl: "h-14 px-8 py-4 text-lg rounded-2xl",
  icon: "h-10 w-10 rounded-2xl",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "font-bold transition-all duration-200 active:scale-[0.96] hover:scale-[1.02]",
          "disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 disabled:hover:scale-100",
          "inline-flex items-center justify-center gap-2",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, type ButtonVariant, type ButtonSize };
