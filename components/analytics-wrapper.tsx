"use client";

import { Analytics } from "@vercel/analytics/next";
import { filterAnalyticsEvent, useCookieConsent } from "@/lib/cookie-consent";

export function AnalyticsWrapper() {
  const { preferences, hasDecided } = useCookieConsent();
  if (!hasDecided || !preferences.analytics) return null;
  return <Analytics beforeSend={filterAnalyticsEvent} />;
}
