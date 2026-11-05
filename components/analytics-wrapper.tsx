"use client";

import { Analytics } from "@vercel/analytics/next";
import { useCookieConsent } from "@/lib/cookie-consent";

export function AnalyticsWrapper() {
  const { preferences, hasDecided } = useCookieConsent();

  // Do not track if user explicitly declined analytics
  if (hasDecided && !preferences.analytics) {
    return null;
  }

  // Only track when user has explicitly granted analytics consent
  if (!preferences.analytics) {
    return null;
  }

  return (
    <Analytics
      beforeSend={(event) => {
        return preferences.analytics ? event : null;
      }}
    />
  );
}
