"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <div className={cn("grid gap-1.5", className)}>
      {showLabel && <span className="text-xs font-medium text-muted-foreground">Appearance</span>}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        className="flex min-h-11 items-center justify-center gap-2 border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>Switch to {isDark ? "light" : "dark"} mode</span>
      </button>
    </div>
  );
}
