import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient } from "@supabase/ssr";
import { CAPTCHA_FAILED_MESSAGE, readCaptchaToken, isCaptchaError } from "./turnstile.ts";
import { normalizeOtpEmail, readOtpChallenge, otpRetrySeconds, requestEmailOtp, verifyEmailOtp, OTP_INVALID_MESSAGE } from "./email-otp.ts";

test("validates email and bounded, non-authoritative recovery state", () => {
  assert.equal(normalizeOtpEmail(" Member@Example.test "), "member@example.test");
  for (const email of [null, {}, "", "x@y", "x y@example.test", `${"x".repeat(250)}@example.test`]) assert.equal(normalizeOtpEmail(email), null);
  const now = 1_000_000;
  const challenge = { email: "member@example.test", next: "/profile", requestedAt: now };
  assert.deepEqual(readOtpChallenge(JSON.stringify(challenge), now), challenge);
  assert.equal(otpRetrySeconds(challenge, now), 60);
  assert.equal(otpRetrySeconds(challenge, now + 60_000), 0);
  assert.equal(readOtpChallenge(JSON.stringify(challenge), now + 600_000), null);
  for (const raw of ["broken", "null", "{}", JSON.stringify({ ...challenge, requestedAt: now + 1 }), JSON.stringify({ ...challenge, requestedAt: "1000000" })]) assert.equal(readOtpChallenge(raw, now), null);
});

test("requests codes for existing accounts only and masks unknown-account/delivery errors", async () => {
  let request;
  await requestEmailOtp({ signInWithOtp: async (value) => { request = value; return { error: null }; } }, "member@example.test");
  assert.deepEqual(request, { email: "member@example.test", options: { shouldCreateUser: false } });
  for (const error of [{ message: "Unknown account", status: 400 }, { message: "SMTP secret failure", status: 500 }, { status: 429 }]) {
    assert.equal(await requestEmailOtp({ signInWithOtp: async () => ({ error }) }, "unknown@example.test"), null);
  }
  assert.equal(await requestEmailOtp({ signInWithOtp: async () => { throw Error("private host"); } }, "member@example.test"), null);
});

test("verification rejects malformed, invalid, expired/reused codes and handles rate limits/outages", async () => {
  let calls = 0;
  const failure = { verifyOtp: async () => { calls++; return { data: {}, error: { message: "private detail", status: 403 } }; } };
  for (const token of ["", "123", "12345678901", "12345a", "１２３４５６"]) assert.match(await verifyEmailOtp(failure, "member@example.test", token), /6–10 digit/);
  assert.equal(calls, 0);
  for (const token of ["123456", "12345678", "1234567890"]) assert.equal(await verifyEmailOtp(failure, "member@example.test", token), OTP_INVALID_MESSAGE);
  assert.match(await verifyEmailOtp({ verifyOtp: async () => ({ error: { status: 429 }, data: {} }) }, "member@example.test", "12345678"), /Too many attempts/);
  for (const status of [0, 500, 502, 503]) assert.match(await verifyEmailOtp({ verifyOtp: async () => ({ error: { status, message: "private infrastructure detail" }, data: {} }) }, "member@example.test", "12345678"), /temporarily unavailable/);
  assert.match(await verifyEmailOtp({ verifyOtp: async () => { throw Error("private transport"); } }, "member@example.test", "12345678"), /reach the sign-in service/);
  for (const data of [{}, { session: {} }, { user: {} }]) assert.equal(await verifyEmailOtp({ verifyOtp: async () => ({ data, error: null }) }, "member@example.test", "12345678"), OTP_INVALID_MESSAGE);
});

test("real SSR SDK sends provider-supported email verification and persists its session cookies", async () => {
  const jar = new Map();
  let posted;
  const user = { id: "test-member", aud: "authenticated", role: "authenticated", email: "member@example.test" };
  const auth = createServerClient("https://project.example.test", "public-test-key", {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value, options }) => jar.set(name, { value, options })),
    },
    global: { fetch: async (url, options) => {
      assert.equal(new URL(url).pathname, "/auth/v1/verify");
      posted = JSON.parse(options.body);
      return Response.json({ access_token: "test-access-token", refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, user });
    } },
  }).auth;
  assert.equal(await verifyEmailOtp(auth, user.email, "12345678"), null);
  assert.deepEqual(posted, { email: user.email, token: "12345678", type: "email", gotrue_meta_security: {} });
  assert.ok([...jar.keys()].some(name => name.includes("auth-token")));
  assert.ok([...jar.values()].some(({ options }) => options.path === "/"));
});

test("real SSR SDK disables automatic account creation on the OTP HTTP request", async () => {
  let posted;
  const auth = createServerClient("https://project.example.test", "public-test-key", {
    cookies: { getAll: () => [], setAll: () => {} },
    global: { fetch: async (url, options) => {
      assert.equal(new URL(url).pathname, "/auth/v1/otp");
      posted = JSON.parse(options.body);
      return Response.json({});
    } },
  }).auth;
  await requestEmailOtp(auth, "member@example.test");
  assert.equal(posted.email, "member@example.test");
  assert.equal(posted.create_user, false);
});

test("sign-in code requests forward Turnstile tokens and surface failed bot checks", async () => {
  let request;
  assert.equal(await requestEmailOtp({ signInWithOtp: async (value) => { request = value; return { error: null }; } }, "member@example.test", "turnstile-token"), null);
  assert.deepEqual(request, { email: "member@example.test", options: { shouldCreateUser: false, captchaToken: "turnstile-token" } });
  const captcha = { code: "captcha_failed", status: 400, message: "captcha protection: request disallowed (invalid-input-response)" };
  assert.equal(await requestEmailOtp({ signInWithOtp: async () => ({ error: captcha }) }, "member@example.test"), CAPTCHA_FAILED_MESSAGE);
  let verify;
  assert.equal(await verifyEmailOtp({ verifyOtp: async (value) => { verify = value; return { data: {}, error: captcha }; } }, "member@example.test", "12345678", "turnstile-token"), CAPTCHA_FAILED_MESSAGE);
  assert.deepEqual(verify.options, { captchaToken: "turnstile-token" });
});

test("Turnstile helpers read bounded tokens and recognise provider captcha errors", () => {
  const form = new FormData();
  assert.equal(readCaptchaToken(form), undefined);
  form.set("captcha_token", "");
  assert.equal(readCaptchaToken(form), undefined);
  form.set("captcha_token", "x".repeat(2049));
  assert.equal(readCaptchaToken(form), undefined);
  form.set("captcha_token", "turnstile-token");
  assert.equal(readCaptchaToken(form), "turnstile-token");
  assert.equal(isCaptchaError({ code: "captcha_failed" }), true);
  assert.equal(isCaptchaError({ message: "captcha protection: request disallowed" }), true);
  for (const error of [null, undefined, { code: "invalid_credentials", message: "Invalid login credentials" }]) assert.equal(isCaptchaError(error), false);
});
