import { cn } from "@/lib/utils";

// Match-result reveal: lightweight CSS-driven entrance transition that
// respects prefers-reduced-motion without shipping a JS animation library.
export function StaggerReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("stagger-reveal", className)}>{children}</div>;
}
