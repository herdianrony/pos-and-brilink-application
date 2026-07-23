import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Loader2 } from "lucide-react";

export function EmptyState({
  title,
  description,
  compact = false,
  children,
  icon,
}: {
  title: string;
  description?: string;
  compact?: boolean;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
        <p className="font-bold text-slate-600 text-sm">{title}</p>
        {description && <p className="text-xs mt-1 text-slate-500">{description}</p>}
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      {icon && (
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-4 animate-float">
          {icon}
        </div>
      )}
      <p className="font-bold text-slate-600 text-base">{title}</p>
      {description && <p className="text-sm mt-1 text-slate-500">{description}</p>}
      {children}
    </div>
  );
}

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" }[size];
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className={cn(s, "text-primary animate-spin")} />
    </div>
  );
}