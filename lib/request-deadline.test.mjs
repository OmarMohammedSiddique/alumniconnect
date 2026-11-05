import assert from "node:assert/strict";
import test from "node:test";
import { withRequestDeadline, discoveryFailureMessage } from "./request-deadline.ts";

test("stalled operations reject and abort their underlying work", async () => {
  let signal;
  await assert.rejects(withRequestDeadline(async (value) => {
    signal = value;
    return new Promise(() => {});
  }, 10), { name: "TimeoutError" });
  assert.equal(signal.aborted, true);
});

test("the deadline covers a response body that never finishes", async () => {
  await assert.rejects(withRequestDeadline(async () => {
    const response = new Response(new ReadableStream({ start() {} }));
    return response.json();
  }, 10), { name: "TimeoutError" });
});

test("unmount cancellation rejects even if the dependency ignores its signal", async () => {
  const controller = new AbortController();
  let signal;
  const pending = withRequestDeadline(async (value) => {
    signal = value;
    return new Promise(() => {});
  }, 1000, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(signal.aborted, true);
  await assert.rejects(withRequestDeadline(async () => assert.fail("already aborted"), 1000, controller.signal), { name: "AbortError" });
});

test("successful results and original failures pass through", async () => {
  assert.equal(await withRequestDeadline(async () => 42, 1000), 42);
  const failure = new Error("offline");
  await assert.rejects(withRequestDeadline(async () => { throw failure; }, 1000), error => error === failure);
});

test("expired sessions and rate limits have actionable fixed feedback", () => {
  assert.match(discoveryFailureMessage(401, "private detail"), /Sign in again/);
  assert.match(discoveryFailureMessage(429, "private detail", "17"), /17 seconds/);
  assert.match(discoveryFailureMessage(429, "private detail", "invalid"), /a minute/);
  assert.equal(discoveryFailureMessage(503, "Retry comparison"), "Retry comparison");
});
