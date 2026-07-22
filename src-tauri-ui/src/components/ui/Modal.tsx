import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Modal({
  open,
  onClose,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const w = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  }[size];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/50 animate-fadeIn"
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative bg-white rounded-3xl shadow-float w-full max-h-[92vh] overflow-y-auto animate-bounceIn border border-slate-200/50",
          w,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}