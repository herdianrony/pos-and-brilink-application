/* ── Modal (compatibility wrapper around Radix Dialog) ──
 * 
 * Preserves the original Modal API: { open, onClose, size, eyebrow, children }
 * Internally delegates to @radix-ui/react-dialog.
 * All existing consumer code works without changes.
 */
import { useCallback, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogEyebrow, type DialogSize } from "./shadcn/dialog";

/* Re-export Dialog primitives for consumers that want to migrate incrementally */
export { DialogContent, DialogEyebrow, Dialog, DialogTitle, DialogDescription } from "./shadcn/dialog";

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
  size?: DialogSize;
  eyebrow?: string;
}) {
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) onClose();
    },
    [onClose],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size={size}
        hideClose
        className="!p-0"
        /* Radix requires a Title for accessibility. Use sr-only so it doesn't 
           break existing layouts that render their own titles inside CardHeader. */
      >
        <DialogTitle className="sr-only">{eyebrow ?? "Dialog"}</DialogTitle>
        {eyebrow && <DialogEyebrow className="px-6 pt-5 block text-center">{eyebrow}</DialogEyebrow>}
        {children}
      </DialogContent>
    </Dialog>
  );
}