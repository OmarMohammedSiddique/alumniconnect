// Server-side error reporting (#120). Inert unless a Sentry DSN is configured.
import * as Sentry from "@sentry/nextjs";
import { buildSentryOptions, scrubEvent } from "@/lib/sentry-options";

export function register() {
  const options = buildSentryOptions(process.env);
  if (!options.enabled) return;
  Sentry.init({ ...options, beforeSend: scrubEvent });
}

// Reports errors thrown in server components, server actions and route handlers.
export const onRequestError = Sentry.captureRequestError;
