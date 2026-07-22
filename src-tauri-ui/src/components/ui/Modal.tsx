import type { ReactNode, useCallback, useEffect, useRef } from "react";
import { cn } from "../../lib/cn";

/* ------------------------------------------------------------------ */
/*  Focus-trappable dialog                                              */
/* ------------------------------------------------------------------ */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  children,
  size = "md",
  eyebrow,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  eyebrow?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const w = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  }[size];

  /* ── Focus trapping ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR,
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    // Move focus into modal
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      FOCUSABLE_SELECTOR,
    );
    if (focusable) focusable.focus();

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={eyebrow ?? "Dialog"}
    >
      <div
        className="absolute inset-0 bg-slate-950/50 animate-fadeIn"
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={cn(
          "relative bg-white rounded-3xl shadow-float w-full max-h-[92vh] overflow-y-auto animate-bounceIn border border-slate-200/50",
          w,
        )}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
