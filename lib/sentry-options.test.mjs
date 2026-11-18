import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSentryOptions,
  redactEmails,
  resolveSentryDsn,
  scrubEvent,
} from "./sentry-options.ts";

const DSN = "https://public@o0.ingest.sentry.io/0";

test("Sentry stays disabled when no DSN is configured", () => {
  const options = buildSentryOptions({ NODE_ENV: "production" });
  assert.equal(options.enabled, false);
  assert.equal(options.dsn, undefined);
});

test("a blank DSN counts as not configured", () => {
  assert.equal(resolveSentryDsn({ SENTRY_DSN: "   " }), undefined);
  assert.equal(resolveSentryDsn({ NEXT_PUBLIC_SENTRY_DSN: "" }), undefined);
});

test("the server DSN wins over the public one", () => {
  assert.equal(
    resolveSentryDsn({ SENTRY_DSN: DSN, NEXT_PUBLIC_SENTRY_DSN: "https://other@o0.ingest.sentry.io/1" }),
    DSN,
  );
  assert.equal(resolveSentryDsn({ NEXT_PUBLIC_SENTRY_DSN: DSN }), DSN);
});

test("options never enable personal data, tracing or client reports", () => {
  const options = buildSentryOptions({ SENTRY_DSN: DSN, VERCEL_ENV: "preview" });
  assert.equal(options.enabled, true);
  assert.equal(options.environment, "preview");
  assert.deepEqual(options.dataCollection, {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  });
  assert.equal(options.tracesSampleRate, 0);
  assert.equal(options.sendClientReports, false);
});

test("email addresses are redacted from text", () => {
  assert.equal(
    redactEmails("No profile for amina.verify@test.local or A@B.CO"),
    "No profile for [email] or [email]",
  );
});

test("scrubEvent removes identifying request and user data", () => {
  const event = scrubEvent({
    type: undefined,
    user: { id: "user-1", email: "amina@test.local", ip_address: "203.0.113.5" },
    server_name: "host-1",
    message: "Failed for amina@test.local",
    request: {
      url: "https://example.test/auth/callback?code=secret#frag",
      query_string: "code=secret",
      cookies: { session: "token" },
      headers: { authorization: "Bearer token" },
      data: { password: "hunter2" },
    },
    exception: { values: [{ type: "Error", value: "duplicate key amina@test.local" }] },
    breadcrumbs: [
      { message: "fetch for amina@test.local", data: { url: "/api/match?token=abc" } },
      { category: "navigation", data: { from: "/login?next=/a", to: "/dashboard#x" } },
    ],
  });

  assert.equal(event.user, undefined);
  assert.equal(event.server_name, undefined);
  assert.equal(event.message, "Failed for [email]");
  assert.deepEqual(event.request, { url: "https://example.test/auth/callback" });
  assert.equal(event.exception.values[0].value, "duplicate key [email]");
  assert.equal(event.breadcrumbs[0].message, "fetch for [email]");
  assert.equal(event.breadcrumbs[0].data.url, "/api/match");
  assert.deepEqual(event.breadcrumbs[1].data, { from: "/login", to: "/dashboard" });
  assert.equal(JSON.stringify(event).includes("secret"), false);
  assert.equal(JSON.stringify(event).includes("hunter2"), false);
});

test("scrubEvent tolerates an event with no request or exception", () => {
  assert.deepEqual(scrubEvent({ type: undefined }), { type: undefined });
});
