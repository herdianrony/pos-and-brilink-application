import * as React from "react"
import { cn } from "@/lib/cn"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50",
          "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
          "transition-all text-sm font-medium placeholder:text-slate-500",
          "hover:border-slate-300",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
