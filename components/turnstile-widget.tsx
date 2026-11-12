"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { CAPTCHA_FIELD } from "@/lib/turnstile";

type RenderOptions = {
  sitekey: string;
  action?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
  appearance?: "always" | "execute" | "interaction-only";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => boolean | void;
  "timeout-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: RenderOptions) => string | undefined;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; script.remove(); reject(new Error("Turnstile unavailable")); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Renders Cloudflare Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, and
 * reports the current single-use token. Pass the latest server-action result as
 * `resetKey` so each submission gets a fresh token. Renders nothing when the
 * site key is not configured, so local development keeps working unchanged.
 */
export function TurnstileWidget({ action, onToken, resetKey }: { action: string; onToken: (token: string) => void; resetKey?: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);
  useEffect(() => { onTokenRef.current = onToken; });

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        size: "flexible",
        // Most visitors pass silently; a checkbox appears only when Cloudflare needs one.
        appearance: "interaction-only",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "timeout-callback": () => onTokenRef.current(""),
        "error-callback": () => { onTokenRef.current(""); },
      });
    }).catch(() => onTokenRef.current(""));
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = undefined;
    };
  }, [action]);

  // Tokens are single-use: after every server response, request a new one.
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) { firstReset.current = false; return; }
    if (!widgetRef.current || !window.turnstile) return;
    onTokenRef.current("");
    window.turnstile.reset(widgetRef.current);
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <div className="grid gap-1">
      <div ref={containerRef} />
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
        Protected from bots by Cloudflare Turnstile
      </p>
    </div>
  );
}

/** Hidden field carrying the Turnstile token into a server-action form. */
export function CaptchaTokenInput({ token }: { token: string }) {
  return <input type="hidden" name={CAPTCHA_FIELD} value={token} />;
}
