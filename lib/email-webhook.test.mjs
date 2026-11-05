import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  verifyResendWebhook,
  handleResendWebhookEvent,
  parseWebhookSecret,
  isRecipientSuppressed,
  clearSuppressedRecipients,
  clearProcessedEventIds,
} from "./email-webhook.ts";

function createValidWebhookFixture({
  secret = "whsec_MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE",
  id = "msg_test_abc123",
  timestamp = Math.floor(Date.now() / 1000).toString(),
  payload = {
    type: "email.delivered",
    created_at: new Date().toISOString(),
    data: {
      email_id: "email_12345",
      from: "notifications@auth.alumnikonneqt.com",
      to: ["recipient@example.test"],
      subject: "Your mentorship notification",
    },
  },
} = {}) {
  const rawBody = JSON.stringify(payload);
  const secretKey = parseWebhookSecret(secret);
  const toSign = `${id}.${timestamp}.${rawBody}`;
  const sig = crypto.createHmac("sha256", secretKey).update(toSign).digest("base64");

  return {
    secret,
    id,
    timestamp,
    signature: `v1,${sig}`,
    rawBody,
    payload,
  };
}

test("verifyResendWebhook verifies valid signature with whsec_ secret", () => {
  const fixture = createValidWebhookFixture();
  const res = verifyResendWebhook({
    rawBody: fixture.rawBody,
    headers: {
      id: fixture.id,
      timestamp: fixture.timestamp,
      signature: fixture.signature,
    },
    secret: fixture.secret,
    nowSeconds: parseInt(fixture.timestamp, 10),
  });

  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.event.type, "email.delivered");
    assert.equal(res.event.data.email_id, "email_12345");
  }
});

test("verifyResendWebhook rejects expired or future timestamps (replay prevention)", () => {
  const fixture = createValidWebhookFixture();
  const oldTimestamp = (parseInt(fixture.timestamp, 10) - 400).toString(); // 400s old > 300s limit
  const secretKey = parseWebhookSecret(fixture.secret);
  const toSign = `${fixture.id}.${oldTimestamp}.${fixture.rawBody}`;
  const sig = crypto.createHmac("sha256", secretKey).update(toSign).digest("base64");

  const res = verifyResendWebhook({
    rawBody: fixture.rawBody,
    headers: {
      id: fixture.id,
      timestamp: oldTimestamp,
      signature: `v1,${sig}`,
    },
    secret: fixture.secret,
    nowSeconds: parseInt(fixture.timestamp, 10),
    toleranceSeconds: 300,
  });

  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.equal(res.status, 401);
    assert.match(res.reason, /timestamp expired/);
  }
});

test("verifyResendWebhook rejects missing or malformed headers", () => {
  const fixture = createValidWebhookFixture();

  // Missing id
  assert.equal(
    verifyResendWebhook({
      rawBody: fixture.rawBody,
      headers: { id: null, timestamp: fixture.timestamp, signature: fixture.signature },
      secret: fixture.secret,
    }).status,
    400
  );

  // Missing timestamp
  assert.equal(
    verifyResendWebhook({
      rawBody: fixture.rawBody,
      headers: { id: fixture.id, timestamp: null, signature: fixture.signature },
      secret: fixture.secret,
    }).status,
    400
  );

  // Missing signature
  assert.equal(
    verifyResendWebhook({
      rawBody: fixture.rawBody,
      headers: { id: fixture.id, timestamp: fixture.timestamp, signature: null },
      secret: fixture.secret,
    }).status,
    401
  );
});

test("verifyResendWebhook rejects signature mismatch and malformed payload", () => {
  const fixture = createValidWebhookFixture();

  // Wrong signature
  const mismatch = verifyResendWebhook({
    rawBody: fixture.rawBody,
    headers: {
      id: fixture.id,
      timestamp: fixture.timestamp,
      signature: "v1,invalidsignature==",
    },
    secret: fixture.secret,
    nowSeconds: parseInt(fixture.timestamp, 10),
  });
  assert.equal(mismatch.valid, false);
  if (!mismatch.valid) {
    assert.equal(mismatch.status, 401);
  }

  // Malformed body
  const badBody = "not a json string";
  const toSign = `${fixture.id}.${fixture.timestamp}.${badBody}`;
  const sig = crypto
    .createHmac("sha256", parseWebhookSecret(fixture.secret))
    .update(toSign)
    .digest("base64");

  const malformed = verifyResendWebhook({
    rawBody: badBody,
    headers: {
      id: fixture.id,
      timestamp: fixture.timestamp,
      signature: `v1,${sig}`,
    },
    secret: fixture.secret,
    nowSeconds: parseInt(fixture.timestamp, 10),
  });
  assert.equal(malformed.valid, false);
  if (!malformed.valid) {
    assert.equal(malformed.status, 400);
  }
});

test("handleResendWebhookEvent deduplicates repeated events and handles suppression", () => {
  clearProcessedEventIds();
  clearSuppressedRecipients();

  const eventId = "evt_dedup_001";
  const deliveredEvent = {
    type: "email.delivered",
    created_at: new Date().toISOString(),
    data: {
      email_id: "em_1",
      to: ["user@example.test"],
    },
  };

  // First process
  const first = handleResendWebhookEvent(eventId, deliveredEvent);
  assert.equal(first.processed, true);
  assert.equal(first.duplicate, false);

  // Second process with same eventId
  const second = handleResendWebhookEvent(eventId, deliveredEvent);
  assert.equal(second.processed, true);
  assert.equal(second.duplicate, true);

  // Bounce event triggers suppression
  const bounceEvent = {
    type: "email.bounced",
    created_at: new Date().toISOString(),
    data: {
      email_id: "em_2",
      to: ["bounced.user@example.test"],
      bounce: { type: "hard", message: "Mailbox does not exist" },
    },
  };

  assert.equal(isRecipientSuppressed("bounced.user@example.test"), false);
  const bounceResult = handleResendWebhookEvent("evt_bounce_001", bounceEvent);
  assert.equal(bounceResult.suppressed, true);
  assert.equal(isRecipientSuppressed("bounced.user@example.test"), true);

  // Complaint event triggers suppression
  const complaintEvent = {
    type: "email.complained",
    created_at: new Date().toISOString(),
    data: {
      email_id: "em_3",
      to: ["complaint.user@example.test"],
    },
  };

  assert.equal(isRecipientSuppressed("complaint.user@example.test"), false);
  const complaintResult = handleResendWebhookEvent("evt_complaint_001", complaintEvent);
  assert.equal(complaintResult.suppressed, true);
  assert.equal(isRecipientSuppressed("complaint.user@example.test"), true);
});
