import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { CardHeader } from "./Card";

export function Modal({
  eyebrow,
  title,
  size = "md",
  onClose,
  children,
}: {
  eyebrow?: string;
  title: string;
  size?: "sm" | "md" | "lg";
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-6 backdrop-blur">
      <section
        className={cn(
          "max-h-[calc(100vh-48px)] w-full overflow-auto rounded-[28px] bg-white p-5.5 shadow-[0_30px_90px_rgba(15,23,42,.35)]",
          size === "sm" && "max-w-[440px]",
          size === "md" && "max-w-[720px]",
          size === "lg" && "max-w-[780px]",
        )}
      >
        <CardHeader>
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </CardHeader>
        {children}
      </section>
    </div>
  );
}
