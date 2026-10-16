import type { ComponentProps } from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  error: "border-destructive bg-card text-destructive",
  success: "border-success-foreground bg-success text-success-foreground",
  info: "border-border bg-surface text-foreground",
};

export function StatusMessage({ tone = "info", className, children, ...props }: ComponentProps<"div"> & { tone?: keyof typeof TONES }) {
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CheckCircle2 : Info;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm leading-relaxed", TONES[tone], className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
