"use client";

import Link from "next/link";
import { Cookie, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCookieConsent,
  useCookieSettingsModal,
} from "@/lib/cookie-consent";
import { CookieSettingsDialog } from "./cookie-settings-dialog";

export function CookieBanner() {
  const { hasDecided, acceptAll, rejectNonEssential, openSettings } = useCookieConsent();
  const { isOpen, close } = useCookieSettingsModal();

  return (
    <>
      {/* Banner is shown only until the user makes their initial choice */}
      {!hasDecided && (
        <aside
          role="region"
          aria-label="Cookie and local storage consent"
          className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-primary bg-card/95 text-foreground shadow-2xl backdrop-blur-md transition-all duration-300"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-6 lg:px-8">
            <div className="flex items-start gap-3 sm:max-w-3xl">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Cookie className="size-4" aria-hidden="true" />
              </div>
              <div className="grid gap-1 text-xs sm:text-sm">
                <p className="font-semibold text-foreground">
                  Cookie &amp; Local Storage Preferences
                </p>
                <p className="leading-relaxed text-muted-foreground">
                  We use cookies and browser storage to maintain secure authentication sessions, remember your theme preference, and measure anonymous usage to refine the AlumniKonneQt prototype. You can accept all, reject non-essential cookies, or customize your choices.{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Read our Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openSettings}
                className="gap-1.5"
              >
                <Settings2 className="size-3.5" aria-hidden="true" />
                Customize
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={rejectNonEssential}
              >
                Reject Non-Essential
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={acceptAll}
                className="gap-1.5"
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Accept All
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Preferences Dialog is available at all times (from banner, footer, or privacy page) */}
      <CookieSettingsDialog isOpen={isOpen} onClose={close} />
    </>
  );
}
