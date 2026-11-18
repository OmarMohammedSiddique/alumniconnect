// Shared Sentry settings for the server, edge and browser runtimes (#120).
// Error reports only: no tracing, no session replay, no default personal data.
// Everything here is pure so it can be unit tested without the SDK.

import type { ErrorEvent } from "@sentry/nextjs";

type DataCollection = NonNullable<Parameters<typeof import("@sentry/nextjs").init>[0]>["dataCollection"];

type Env = Record<string, string | undefined>;

// The SDK collects all of this by default, so each item is switched off
// explicitly. `userInfo: false` also tells Sentry not to store the sender's IP
// address or derive a location from it.
const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
} as const satisfies DataCollection;

export interface SentryBaseOptions {
  dsn: string | undefined;
  enabled: boolean;
  environment: string;
  dataCollection: typeof DATA_COLLECTION;
  tracesSampleRate: 0;
  sendClientReports: false;
}

// The DSN is not a secret: it only allows sending events. The server prefers
// SENTRY_DSN and falls back to the public one the Vercel integration provides.
export function resolveSentryDsn(env: Env): string | undefined {
  const dsn = (env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();
  return dsn === "" ? undefined : dsn;
}

export function buildSentryOptions(env: Env): SentryBaseOptions {
  const dsn = resolveSentryDsn(env);
  return {
    dsn,
    enabled: dsn !== undefined,
    environment:
      env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV ?? env.NODE_ENV ?? "development",
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: 0,
    sendClientReports: false,
  };
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function redactEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, "[email]");
}

function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

// Removes anything that could identify a member before an event leaves the app:
// the user object, cookies, headers, request bodies, query strings (which can
// carry OAuth codes and one-time tokens) and email addresses in error text.
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  delete event.user;
  delete event.server_name;

  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
    if (typeof event.request.url === "string") {
      event.request.url = stripQuery(event.request.url);
    }
  }

  if (typeof event.message === "string") {
    event.message = redactEmails(event.message);
  }

  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === "string") {
      exception.value = redactEmails(exception.value);
    }
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.message === "string") {
      breadcrumb.message = redactEmails(breadcrumb.message);
    }
    const data = breadcrumb.data;
    if (data) {
      for (const key of ["url", "from", "to"]) {
        if (typeof data[key] === "string") data[key] = stripQuery(data[key]);
      }
    }
  }

  return event;
}
