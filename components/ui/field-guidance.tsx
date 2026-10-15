import type { ReactNode } from "react";

export function FieldGuidance({ id, label, value, maxLength, children }: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  children: ReactNode;
}) {
  const atLimit = value.length >= maxLength;

  return (
    <div className="grid gap-1 text-muted-foreground">
      <p id={`${id}-help`} className="text-sm">{children}</p>
      <p id={`${id}-count`} className="text-xs tabular-nums">
        {value.length} of {maxLength} characters
        {value.length === maxLength && " (limit reached)"}
        {value.length > maxLength && ` (${value.length - maxLength} over limit)`}
      </p>
      <span role="status" aria-atomic="true" className="sr-only">
        {atLimit ? `${label} character limit reached.` : ""}
      </span>
    </div>
  );
}
