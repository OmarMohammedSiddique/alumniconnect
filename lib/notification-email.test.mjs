import assert from "node:assert/strict";
import test from "node:test";

import { isRecipientPermitted } from "./email-delivery.ts";
import { registerHooks } from "node:module";
// Match the app bundler's extension resolution for these two modules only.
const hook = registerHooks({ resolve(specifier, context, nextResolve) {
  if (["./email-delivery", "./notification-email"].includes(specifier) &&
      /\/notification-(email|worker)\.ts$/.test(new URL(context.parentURL).pathname)) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
} });
const { buildNotificationEmail, emailHash, notificationOrigin } = await import("./notification-email.ts");
const { processNotificationEmails } = await import("./notification-worker.ts");
hook.deregister();

const event = { id: "event-1", event_key: "request:1", recipient_id: "recipient-1", kind: "request_received", attempts: 1, created_at: new Date().toISOString() };

test("activity templates contain protected links, plain-text opt-out and no contact data", () => {
  for (const kind of ["request_received", "connection_accepted", "request_declined", "matches_ready"]) {
    const email = buildNotificationEmail({ ...event, kind }, "member@example.test", "https://app.example.test");
    assert.equal(email.idempotencyKey, "notification/event-1");
    assert.match(email.html, /https:\/\/app.example.test\/profile\/email-preferences/);
    assert.match(email.text, /Manage email preferences or unsubscribe: https:/);
    assert.ok(!email.html.includes("member@example.test"));
    if (kind === "matches_ready") assert.match(email.text, /suggestions/);
  }
});

test("notification links reject unsafe or missing origins", () => {
  for (const origin of [undefined, "", "javascript:alert(1)", "https://user:secret@example.test", "https://example.test/path", "https://example.test?redirect=evil", "http://remote.test"]) {
    assert.throws(() => notificationOrigin(origin));
  }
  assert.equal(notificationOrigin("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  assert.equal(emailHash(" USER@EXAMPLE.TEST "), emailHash("user@example.test"));
});

function database({ eligible = true, suppressed = false, confirmed = true, outcomeError = false, eligibilityError = false, events = [event] } = {}) {
  const updates = [], lookups = [];
  return {
    updates, lookups,
    rpc: async (name) => name === "claim_email_events" ? { data: events } : { data: eligible, error: eligibilityError },
    auth: { admin: { getUserById: async (id) => {
      lookups.push(id);
      return { data: { user: { email: "member@example.test", email_confirmed_at: confirmed ? "2026-01-01" : null } } };
    } } },
    from(table) {
      let update;
      const query = {
        update(value) { update = value; return query; },
        select() { return query; },
        eq() { return query; },
        in() { return query; },
        lt() { return query; },
        gte() { return query; },
        maybeSingle: async () => ({ data: suppressed ? { email_hash: "hash" } : null }),
        then(resolve) {
          if (table === "email_outbox" && update) updates.push(update);
          return Promise.resolve({ error: outcomeError ? { message: "db down" } : null }).then(resolve);
        },
      };
      return query;
    },
  };
}
const options = (fetchFn) => ({ deliveryMode: "live", apiKey: "test-only", fetchFn, maxRetries: 0 });

test("worker resolves recipient from Auth and sends once with stable provider idempotency", async () => {
  const db = database();
  let sends = 0;
  await processNotificationEmails(db, "https://app.example.test", options(async (_url, init) => {
    sends++;
    assert.equal(init.headers["Idempotency-Key"], "notification/event-1");
    assert.deepEqual(JSON.parse(init.body).to, ["member@example.test"]);
    return Response.json({ id: "provider-1" });
  }));
  assert.equal(sends, 1);
  assert.deepEqual(db.lookups, ["recipient-1"]);
  assert.deepEqual(db.updates.at(-1), { status: "sent", provider_id: "provider-1", last_error: null });
});

test("opt-out/stale/blocked events, suppressions and unconfirmed recipients never send", async () => {
  for (const config of [{ eligible: false }, { suppressed: true }, { confirmed: false }]) {
    const db = database(config);
    await processNotificationEmails(db, "https://app.example.test", options(async () => assert.fail("must not send")));
    assert.equal(db.updates.at(-1).status, "skipped");
    if (!config.eligible && "eligible" in config) assert.deepEqual(db.lookups, []);
  }
});

test("outages retry with a delay, exhausted and permanent failures terminate", async () => {
  for (const [status, attempts, expected] of [[503, 1, "pending"], [429, 1, "pending"], [503, 5, "failed"], [422, 1, "failed"]]) {
    const db = database({ events: [{ ...event, attempts }] });
    await processNotificationEmails(db, "https://app.example.test", options(async () => new Response("provider details", { status })));
    const last = db.updates.at(-1);
    assert.equal(last.status, expected);
    assert.ok(!JSON.stringify(last).includes("provider details"));
    if (expected === "pending") assert.ok(Date.parse(last.available_at) > Date.now());
  }
});

test("eligibility outages do not send and retain a retryable event", async () => {
  const db = database({ eligibilityError: true });
  await processNotificationEmails(db, "https://app.example.test", options(async () => assert.fail("must not send")));
  assert.equal(db.updates.at(-1).status, "pending");
});

test("mocked delivery is recorded as skipped rather than provider acceptance", async () => {
  const db = database();
  await processNotificationEmails(db, "https://app.example.test", { deliveryMode: "mock" });
  assert.equal(db.updates.at(-1).status, "skipped");
  assert.equal(db.updates.at(-1).last_error, "MOCKED_OR_SUPPRESSED");
});

test("missing live credentials fail before claiming or consuming queued events", async () => {
  const prior = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    await assert.rejects(() => processNotificationEmails({ rpc: () => assert.fail("must not claim") }, "https://app.example.test", { deliveryMode: "live" }), /not configured/);
  } finally {
    if (prior !== undefined) process.env.RESEND_API_KEY = prior;
  }
});


test("Vercel previews retain destination isolation even with NODE_ENV production", () => {
  const nodeEnv = process.env.NODE_ENV, vercelEnv = process.env.VERCEL_ENV;
  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    assert.equal(isRecipientPermitted("real@member.invalid", { allowedDomains: ["example.test"], allowedRecipients: [] }), false);
    assert.equal(isRecipientPermitted("fixture@example.test", { allowedDomains: ["example.test"] }), true);
  } finally {
    if (nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnv;
    if (vercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = vercelEnv;
  }
});
