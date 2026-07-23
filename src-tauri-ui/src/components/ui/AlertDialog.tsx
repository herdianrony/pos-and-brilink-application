import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Modal } from "./Modal";
import { Button } from "./Button";

type AlertVariant = "info" | "success" | "warning" | "danger";

const alertConfig: Record<AlertVariant, { icon: typeof Info; color: string; bg: string; ring: string }> = {
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200" },
  success: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  danger: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200" },
};

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
  variant?: AlertVariant;
  confirmText?: string;
}) {
  if (!open) return null;
  const cfg = alertConfig[variant];
  const Icon = cfg.icon;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-7">
        <div className="flex items-start gap-4 mb-6">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-1", cfg.bg, cfg.ring)}>
            <Icon size={28} className={cfg.color} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {title && <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">{title}</h3>}
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose} size="lg" className="w-full">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

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
  variant?: AlertVariant;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}) {
  if (!open) return null;
  const cfg = alertConfig[variant];
  const Icon = cfg.icon;
  const btnVariant = variant === "danger" ? "danger" as const : "primary" as const;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-7">
        <div className="flex items-start gap-4 mb-6">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-1", cfg.bg, cfg.ring)}>
            <Icon size={28} className={cfg.color} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {title && <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">{title}</h3>}
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            {cancelText}
          </Button>
          <Button variant={btnVariant} onClick={onConfirm} disabled={loading} className="flex-1">
            {loading && <Loader2 size={18} className="animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}