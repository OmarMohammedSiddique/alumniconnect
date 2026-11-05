import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  normalizeEmail,
  isRecipientPermitted,
  renderEmailLayout,
  sendApplicationEmail,
  getMockSentEmails,
  clearMockSentEmails,
} from "./email-delivery.ts";

test("escapeHtml safely escapes special HTML characters", () => {
  assert.equal(escapeHtml("Hello & World"), "Hello &amp; World");
  assert.equal(escapeHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(escapeHtml('He said "hello" and \'goodbye\''), "He said &quot;hello&quot; and &#039;goodbye&#039;");
  assert.equal(escapeHtml("Plain safe string"), "Plain safe string");
});

test("normalizeEmail standardizes and checks email format", () => {
  assert.equal(normalizeEmail("  Alumni@Example.Test  "), "alumni@example.test");
  assert.equal(normalizeEmail("mentor.smith+tag@auth.alumnikonneqt.com"), "mentor.smith+tag@auth.alumnikonneqt.com");
  assert.equal(normalizeEmail(null), null);
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail("plainstring"), null);
  assert.equal(normalizeEmail("missing@domain"), null);
  assert.equal(normalizeEmail(`${"a".repeat(250)}@example.com`), null);
});

test("isRecipientPermitted enforces environment destination isolation", () => {
  // Production mode permits any valid email
  assert.equal(isRecipientPermitted("realuser@gmail.com", { isProduction: true }), true);

  // Non-production restricts to allowed domains
  const testOptions = {
    isProduction: false,
    allowedDomains: ["example.test", "auth.alumnikonneqt.com"],
  };
  assert.equal(isRecipientPermitted("test@example.test", testOptions), true);
  assert.equal(isRecipientPermitted("mentor@auth.alumnikonneqt.com", testOptions), true);
  assert.equal(isRecipientPermitted("realuser@gmail.com", testOptions), false);

  // Non-production specific allowed recipient override
  const overrideOptions = {
    isProduction: false,
    allowedRecipients: ["approved-tester@external.org"],
    allowedDomains: ["example.test"],
  };
  assert.equal(isRecipientPermitted("approved-tester@external.org", overrideOptions), true);
  assert.equal(isRecipientPermitted("unapproved@external.org", overrideOptions), false);
});

test("renderEmailLayout renders accessible branded HTML and plain-text fallback", () => {
  const result = renderEmailLayout({
    title: "New Mentorship Request",
    preheader: "Alice sent you a mentorship request",
    bodyHtml: "<p>Alice would like to connect with you regarding <strong>Product Design</strong>.</p>",
    actionText: "Review Request",
    actionUrl: "https://alumnikonneqt.com/requests",
    footerText: "Manage your notification preferences in settings.",
  });

  assert.ok(result.html.includes("<!DOCTYPE html>"));
  assert.ok(result.html.includes("New Mentorship Request"));
  assert.ok(result.html.includes("Review Request"));
  assert.ok(result.html.includes("https://alumnikonneqt.com/requests"));
  assert.ok(result.html.includes("Manage your notification preferences"));

  // Verify text fallback
  assert.ok(result.text.includes("New Mentorship Request"));
  assert.ok(result.text.includes("Alice would like to connect"));
  assert.ok(result.text.includes("Review Request: https://alumnikonneqt.com/requests"));
});

test("sendApplicationEmail rejects invalid recipient and blocks unpermitted destinations", async () => {
  clearMockSentEmails();

  const invalid = await sendApplicationEmail({
    to: "invalid-email-address",
    subject: "Test",
    html: "<p>Test</p>",
  });
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    assert.equal(invalid.code, "INVALID_RECIPIENT");
    assert.equal(invalid.retryable, false);
  }

  const blocked = await sendApplicationEmail(
    {
      to: "external-stranger@somedomain.com",
      subject: "Test",
      html: "<p>Test</p>",
    },
    {
      deliveryMode: "live",
      allowedDomains: ["auth.alumnikonneqt.com"],
      apiKey: "re_test_key",
    }
  );
  assert.equal(blocked.success, false);
  if (!blocked.success) {
    assert.equal(blocked.code, "DESTINATION_BLOCKED");
    assert.equal(blocked.retryable, false);
  }
});

test("sendApplicationEmail captures emails in mock delivery sink", async () => {
  clearMockSentEmails();

  const res = await sendApplicationEmail(
    {
      to: "member@example.test",
      subject: "Mentorship notification",
      html: "<p>Hello member</p>",
      text: "Hello member",
      idempotencyKey: "test-idem-key-1",
    },
    {
      deliveryMode: "mock",
      allowedDomains: ["example.test"],
    }
  );

  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.status, "mocked");
    assert.ok(res.messageId.startsWith("mock_"));
  }

  const sent = getMockSentEmails();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "member@example.test");
  assert.equal(sent[0].subject, "Mentorship notification");
  assert.equal(sent[0].idempotencyKey, "test-idem-key-1");
});

test("sendApplicationEmail contacts Resend API with auth and idempotency headers", async () => {
  let capturedUrl = "";
  let capturedHeaders = {};
  let capturedBody = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: "msg_resend_12345" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await sendApplicationEmail(
    {
      to: "allowed@example.test",
      subject: "Important update",
      html: "<p>Content</p>",
      idempotencyKey: "idem-abc-123",
      tags: [{ name: "category", value: "mentorship" }],
    },
    {
      deliveryMode: "live",
      allowedDomains: ["example.test"],
      apiKey: "re_mock_api_key",
      fetchFn: mockFetch,
    }
  );

  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.messageId, "msg_resend_12345");
    assert.equal(res.status, "queued");
  }

  assert.equal(capturedUrl, "https://api.resend.com/emails");
  assert.equal(capturedHeaders["Authorization"], "Bearer re_mock_api_key");
  assert.equal(capturedHeaders["Idempotency-Key"], "idem-abc-123");
  assert.deepEqual(capturedBody.to, ["allowed@example.test"]);
  assert.equal(capturedBody.subject, "Important update");
  assert.deepEqual(capturedBody.tags, [{ name: "category", value: "mentorship" }]);
});

test("sendApplicationEmail handles 429 rate limit and timeout errors gracefully", async () => {
  // Rate limit
  const mock429Fetch = async () =>
    new Response(JSON.stringify({ message: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });

  const rateLimitedRes = await sendApplicationEmail(
    { to: "test@example.test", subject: "Test", html: "Test" },
    {
      deliveryMode: "live",
      allowedDomains: ["example.test"],
      apiKey: "re_key",
      fetchFn: mock429Fetch,
    }
  );

  assert.equal(rateLimitedRes.success, false);
  if (!rateLimitedRes.success) {
    assert.equal(rateLimitedRes.code, "RATE_LIMITED");
    assert.equal(rateLimitedRes.retryable, true);
  }

  // Timeout
  const mockTimeoutFetch = async () => {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    throw error;
  };

  const timeoutRes = await sendApplicationEmail(
    { to: "test@example.test", subject: "Test", html: "Test" },
    {
      deliveryMode: "live",
      allowedDomains: ["example.test"],
      apiKey: "re_key",
      fetchFn: mockTimeoutFetch,
      timeoutMs: 50,
    }
  );

  assert.equal(timeoutRes.success, false);
  if (!timeoutRes.success) {
    assert.equal(timeoutRes.code, "TIMEOUT");
    assert.equal(timeoutRes.retryable, true);
  }
});
