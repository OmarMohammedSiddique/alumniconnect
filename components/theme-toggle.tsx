"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  className?: string;
  variant?: "compact" | "segmented";
  showLabel?: boolean;
  menuPlacement?: "top" | "bottom";
}

export function ThemeToggle({
  className,
  variant = "compact",
  showLabel = false,
  menuPlacement = "top",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, systemTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const options: Array<{ value: Theme; label: string; icon: typeof Sun; description?: string }> = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      description: `Follows OS (${systemTheme === "dark" ? "Dark" : "Light"})`,
    },
  ];

  if (variant === "segmented") {
    return (
      <div className={cn("grid gap-1.5", className)}>
        {showLabel && (
          <span className="text-xs font-medium text-muted-foreground">Appearance</span>
        )}
        <div
          role="radiogroup"
          aria-label="Theme mode"
          className="inline-flex rounded-lg border border-border bg-card p-1 shadow-xs"
        >
          {options.map(({ value, label, icon: Icon }) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--motion-fast)",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact dropdown button variant
  const currentOption = options.find((o) => o.value === theme) ?? options[0];
  const CurrentIcon =
    theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
      ? Moon
      : Sun;

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Current theme: ${currentOption.label}. Click to change theme.`}
        className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <CurrentIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="capitalize">{currentOption.label}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Select color theme"
          className={cn(
            "absolute right-0 z-(--z-popover) w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md transition-all duration-(--motion-fast)",
            menuPlacement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {options.map(({ value, label, icon: Icon, description }) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors",
                  isSelected
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="text-left">
                    <p className="leading-tight font-medium">{label}</p>
                    {description && (
                      <p className="text-[10px] text-muted-foreground">{description}</p>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
