import type { ReactNode } from "react";
import { Users } from "lucide-react";

export function EmptyState({ title, children, action, headingLevel = 2 }: { title: string; children: ReactNode; action?: ReactNode; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className="rounded-lg border border-dashed border-input bg-card px-5 py-10 text-center sm:px-8">
      <Users className="mx-auto mb-4 size-6 text-muted-foreground" aria-hidden="true" />
      <Heading className="text-base font-semibold">{title}</Heading>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
