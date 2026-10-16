import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "border-border bg-surface text-muted-foreground",
  accent: "border-transparent bg-accent text-accent-foreground",
  success: "border-success-foreground bg-success text-success-foreground",
  warning: "border-transparent bg-warning text-warning-foreground",
  info: "border-transparent bg-info text-info-foreground",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof TONES }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium leading-snug", TONES[tone], className)} {...props} />;
}
