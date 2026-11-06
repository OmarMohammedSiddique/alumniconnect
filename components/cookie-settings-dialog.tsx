"use client";

import { useEffect, useRef, useState, useId, useCallback } from "react";
import { X, ShieldCheck, Sliders, BarChart3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCookieConsent,
} from "@/lib/cookie-consent";

export interface CookieSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CookieSettingsDialog({ isOpen, onClose }: CookieSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  const { preferences, saveConsent, acceptAll, rejectNonEssential } = useCookieConsent();

  // Local draft state for toggles; derives directly from preferences when not edited
  const [draftFunctional, setDraftFunctional] = useState<boolean | null>(null);
  const [draftAnalytics, setDraftAnalytics] = useState<boolean | null>(null);

  const functional = draftFunctional ?? preferences.functional;
  const analytics = draftAnalytics ?? preferences.analytics;

  const handleCloseDialog = useCallback(() => {
    setDraftFunctional(null);
    setDraftAnalytics(null);
    onClose();
  }, [onClose]);

  // Handle native <dialog> open/close and light dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }

    const handleCancel = (e: Event) => {
      e.preventDefault();
      handleCloseDialog();
    };

    const handleClose = () => {
      handleCloseDialog();
    };

    // Fallback light-dismiss for browsers without native `closedby` support (per modern-web-guidance)
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isDialogContent) {
        handleCloseDialog();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleBackdropClick);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [isOpen, handleCloseDialog]);

  const handleSave = () => {
    saveConsent({
      necessary: true,
      functional,
      analytics,
    });
    handleCloseDialog();
  };

  const handleAcceptAll = () => {
    acceptAll();
    handleCloseDialog();
  };

  const handleRejectNonEssential = () => {
    rejectNonEssential();
    handleCloseDialog();
  };

  return (
    <dialog
      ref={dialogRef}
      // Declarative light dismiss attribute
      {...({ closedby: "any" } as Record<string, string>)}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overscroll-contain border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-none open:flex open:flex-col"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Sliders className="size-5" aria-hidden="true" />
          </div>
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Cookie &amp; Storage Preferences
          </h2>
        </div>
        <button
          type="button"
          onClick={handleCloseDialog}
          aria-label="Close cookie settings dialog"
          className="inline-flex size-11 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 text-sm">
        <p id={descId} className="leading-relaxed text-muted-foreground">
          AlumniKonneQt uses cookies and browser local storage to provide a secure and reliable experience.
          Customize your preferences below. Your choices are saved for this device and browser.
        </p>

        <div className="mt-6 divide-y divide-border border-y border-border">
          {/* Strictly Necessary */}
          <div className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold text-foreground">Strictly Necessary Storage</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Essential for Supabase authentication sessions, CSRF protection, secure form submissions, and remembering your privacy decisions. These cannot be disabled.
                </p>
              </div>
              <Badge tone="neutral" className="shrink-0">
                Always Active
              </Badge>
            </div>
          </div>

          {/* Preferences & Functional */}
          <div className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <Sliders className="size-4 text-foreground" aria-hidden="true" />
                  <label htmlFor="pref-functional" className="cursor-pointer font-semibold text-foreground">
                    Preferences &amp; Functional
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Preserves your interface customisations, such as your Light or Dark appearance preference (<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">alumnikonneqt-theme</code>).
                </p>
              </div>
              <input
                id="pref-functional"
                type="checkbox"
                checked={functional}
                onChange={(e) => setDraftFunctional(e.target.checked)}
                className="mt-1 size-5 accent-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Allow preferences and functional storage"
              />
            </div>
          </div>

          {/* Analytics & Performance */}
          <div className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-foreground" aria-hidden="true" />
                  <label htmlFor="pref-analytics" className="cursor-pointer font-semibold text-foreground">
                    Analytics &amp; Performance
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Provides anonymous, aggregated traffic insights (via Vercel Web Analytics) to help evaluate prototype usability and platform stability. No personal identity is tracked.
                </p>
              </div>
              <input
                id="pref-analytics"
                type="checkbox"
                checked={analytics}
                onChange={(e) => setDraftAnalytics(e.target.checked)}
                className="mt-1 size-5 accent-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Allow analytics and performance telemetry"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRejectNonEssential}
        >
          Reject Non-Essential
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAcceptAll}
          >
            Accept All
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            className="gap-1.5 bg-[var(--brand-red-deep)] hover:bg-[var(--brand-red-deep)]"
          >
            <Check className="size-4" aria-hidden="true" />
            Save Preferences
          </Button>
        </div>
      </div>
    </dialog>
  );
}
