"use client";

import {
  ReactNode,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "./DynamicIcon";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ── Modal ─────────────────────────────────────────
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
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-md animate-fadeIn"
        aria-hidden="true"
      />
      <div
        className={`relative bg-white rounded-3xl shadow-float w-full ${w} max-h-[92vh] overflow-y-auto animate-bounceIn border border-slate-200/50`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────
export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-3xl border border-slate-200/60 shadow-card",
        "hover:shadow-pop hover:border-slate-300/60",
        "transition-all duration-300",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────
export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?:
    | "default"
    | "success"
    | "danger"
    | "warning"
    | "primary"
    | "purple"
    | "secondary";
}) {
  const colors = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200/60",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
    primary: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    secondary: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60",
    purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────
export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: {
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "danger"
    | "success"
    | "accent"
    | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary:
      "gradient-primary text-white shadow-glow-primary hover:shadow-pop hover:brightness-110",
    secondary:
      "bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-soft",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger:
      "bg-red-500 text-white hover:bg-red-600 shadow-pop shadow-red-500/25",
    success:
      "gradient-primary text-white shadow-glow-primary hover:brightness-110",
    accent:
      "gradient-accent text-white shadow-glow-accent hover:brightness-110",
    outline:
      "bg-transparent text-primary border-2 border-primary hover:bg-primary/5",
  };
  const sizes = {
    sm: "px-4 py-2 text-xs rounded-xl",
    md: "px-5 py-2.5 text-sm rounded-2xl",
    lg: "px-6 py-3.5 text-base rounded-2xl",
    xl: "px-8 py-4 text-lg rounded-2xl",
  };
  return (
    <button
      className={cn(
        "font-bold transition-all duration-200 active:scale-[0.96] hover:scale-[1.02]",
        "disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 disabled:hover:scale-100",
        "inline-flex items-center justify-center gap-2",
        // P2: Focus-visible ring for accessibility
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────
export function Input({
  label,
  className,
  ...props
}: {
  label?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-bold text-slate-700">{label}</label>
      )}
      <input
        className={cn(
          "w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50",
          "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
          "transition-all text-sm font-medium placeholder:text-slate-400",
          "hover:border-slate-300",
          className,
        )}
        {...props}
      />
    </div>
  );
}

// ── Select ────────────────────────────────────────
export function Select({
  label,
  children,
  className,
  ...props
}: {
  label?: string;
  children: ReactNode;
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-bold text-slate-700">{label}</label>
      )}
      <select
        className={cn(
          "w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50",
          "focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary",
          "transition-all text-sm font-medium cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Empty State ───────────────────────────────────
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-4 animate-float">
        <DynamicIcon
          name={icon}
          fallback="package"
          size={36}
          className="text-slate-300"
        />
      </div>
      <p className="font-bold text-slate-600 text-base">{title}</p>
      {subtitle && <p className="text-sm mt-1 text-slate-400">{subtitle}</p>}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" }[size];
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className={`${s} text-primary animate-spin`} />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────
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
  value: string;
  sub?: string;
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
    <Card className="p-5 animate-fadeIn group">
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
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
              className={`text-xs mt-1 font-semibold ${trend ? trendColor : "text-slate-400"}`}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Section Title ─────────────────────────────────
export function SectionTitle({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-primary shrink-0"
            style={{ backgroundColor: "#00875A" }}
          >
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
          {desc && (
            <p className="text-sm text-slate-400 font-semibold">{desc}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; icon?: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          data-testid={`tab-${t.id}`}
          onClick={() => onChange(t.id)}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
            active === t.id
              ? "bg-white text-primary shadow-pop"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {t.icon && <DynamicIcon name={t.icon} fallback="package" size={16} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── AlertDialog ──────────────────────────────────
export function AlertDialog({
  open,
  onClose,
  title,
  message,
  variant = "info",
  confirmText = "OK",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  variant?: "info" | "success" | "warning" | "danger";
  confirmText?: string;
}) {
  if (!open) return null;
  const config = {
    info: {
      icon: Info,
      color: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-200",
    },
    success: {
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-200",
    },
    danger: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-200",
    },
  }[variant];
  const Icon = config.icon;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-7">
        <div className="flex items-start gap-4 mb-6">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-1",
              config.bg,
              config.ring,
            )}
          >
            <Icon size={28} className={config.color} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {title && (
              <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">
                {title}
              </h3>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={onClose}
            size="lg"
            className="w-full"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── ConfirmDialog ────────────────────────────────
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  variant = "warning",
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  variant?: "info" | "warning" | "danger" | "success";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}) {
  if (!open) return null;
  const config = {
    info: {
      icon: Info,
      color: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-200",
      btn: "primary" as const,
    },
    success: {
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      btn: "success" as const,
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      btn: "primary" as const,
    },
    danger: {
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-200",
      btn: "danger" as const,
    },
  }[variant];
  const Icon = config.icon;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-7">
        <div className="flex items-start gap-4 mb-6">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-1",
              config.bg,
              config.ring,
            )}
          >
            <Icon size={28} className={config.color} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {title && (
              <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">
                {title}
              </h3>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.btn}
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Toast Notification ───────────────────────────
export interface ToastItem {
  id: number;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (toast: Omit<ToastItem, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (t: Omit<ToastItem, "id">) => console.log("[toast]", t),
      success: (m: string, t?: string) => console.log("[success]", t, m),
      error: (m: string, t?: string) => console.error("[error]", t, m),
      warning: (m: string, t?: string) => console.warn("[warning]", t, m),
      info: (m: string, t?: string) => console.log("[info]", t, m),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.random();
      const duration = t.duration ?? 4000;
      setToasts((prev) => [...prev, { ...t, id, duration }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
    },
    [remove],
  );

  const ctx: ToastContextValue = {
    toast,
    success: (message, title) => toast({ type: "success", message, title }),
    error: (message, title) =>
      toast({ type: "error", message, title, duration: 6000 }),
    warning: (message, title) => toast({ type: "warning", message, title }),
    info: (message, title) => toast({ type: "info", message, title }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastContainer toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastItem[];
  onClose: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-100 space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const config = {
          success: {
            icon: CheckCircle2,
            color: "text-emerald-600",
            border: "border-emerald-200",
            bg: "bg-emerald-50",
          },
          error: {
            icon: XCircle,
            color: "text-red-600",
            border: "border-red-200",
            bg: "bg-red-50",
          },
          warning: {
            icon: AlertTriangle,
            color: "text-amber-600",
            border: "border-amber-200",
            bg: "bg-amber-50",
          },
          info: {
            icon: Info,
            color: "text-blue-600",
            border: "border-blue-200",
            bg: "bg-blue-50",
          },
        }[t.type];
        const Icon = config.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto bg-white rounded-2xl shadow-float border-2 p-4 flex items-start gap-3 animate-slideInRight",
              config.border,
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                config.bg,
              )}
            >
              <Icon size={20} className={config.color} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {t.title && (
                <p className="font-extrabold text-slate-900 text-sm">
                  {t.title}
                </p>
              )}
              <p className="text-sm text-slate-600 leading-snug font-medium">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => onClose(t.id)}
              className="text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
