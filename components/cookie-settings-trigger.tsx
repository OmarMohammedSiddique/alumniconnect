"use client";

import type { ComponentProps } from "react";
import { openCookieSettings } from "@/lib/cookie-consent";
import { cn } from "@/lib/utils";

export interface CookieSettingsTriggerProps extends ComponentProps<"button"> {
  label?: string;
}

export function CookieSettingsTrigger({
  label = "Cookie settings",
  className,
  children,
  onClick,
  ...props
}: CookieSettingsTriggerProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        openCookieSettings();
      }}
      className={cn(
        "cursor-pointer text-inherit underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
      {...props}
    >
      {children ?? label}
    </button>
  );
}
