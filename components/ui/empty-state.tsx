import type { ReactNode } from "react";

export function EmptyState({ title, children, action, headingLevel = 2 }: { title: string; children: ReactNode; action?: ReactNode; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className="empty-state">
      <Heading >{title}</Heading>
      <p >{children}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
