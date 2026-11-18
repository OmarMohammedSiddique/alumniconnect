// Browser error reporting (#120). Starts only after the member accepts the
// analytics category, and stays inert when no Sentry DSN is configured.
import * as Sentry from "@sentry/nextjs";
import { getCookieConsentSnapshot, subscribeToCookieConsent } from "@/lib/cookie-consent";
import { buildSentryOptions, scrubEvent } from "@/lib/sentry-options";

const options = buildSentryOptions({
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
});

function hasAnalyticsConsent(): boolean {
  return getCookieConsentSnapshot()?.preferences.analytics === true;
}

let started = false;

function startIfConsented() {
  if (started || !options.enabled || !hasAnalyticsConsent()) return;
  started = true;
  Sentry.init({
    ...options,
    // Session pings would be sent on load regardless of beforeSend.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== "BrowserSession"),
    // The SDK cannot be unloaded, so check live consent on every event.
    beforeSend: (event) => (hasAnalyticsConsent() ? scrubEvent(event) : null),
  });
}

try {
  startIfConsented();
  if (options.enabled) subscribeToCookieConsent(startIfConsented);
} catch {
  // Error reporting must never break the page.
}
