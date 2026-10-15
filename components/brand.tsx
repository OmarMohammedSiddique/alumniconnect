import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 whitespace-nowrap text-lg font-semibold tracking-tight", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Users className="size-5" aria-hidden="true" />
      </span>
      <span>AlumniConnect</span>
    </span>
  );
}

export function PrototypeNotice({ className }: { className?: string }) {
  return (
    <p className={cn("max-w-prose text-xs leading-relaxed text-muted-foreground", className)}>
      Independent academic prototype inspired by Kenya Airways. Not an official product or endorsed by the airline.
    </p>
  );
}
