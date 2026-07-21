import type { ReactNode } from "react";
import { Card, CardHeader } from "./Card";

export function SectionCard({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      {(title || description || actions) && (
        <CardHeader>
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </CardHeader>
      )}
      {children}
    </Card>
  );
}

export const DataPanel = SectionCard;
