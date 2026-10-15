import type { ReactNode } from "react";

export function PageHeading({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <header className="page-heading flex flex-wrap items-start justify-between gap-4">
      <div><h1>{title}</h1><p>{children}</p></div>
      {action}
    </header>
  );
}
