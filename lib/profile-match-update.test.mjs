import assert from "node:assert/strict";
import test from "node:test";
import { createProfileMatchUpdater } from "./profile-match-update.ts";

test("refreshes saved profile matching through the existing endpoint", async () => {
  const statuses = [];
  const requests = [];
  const update = createProfileMatchUpdater((status) => statuses.push(status), async (...args) => {
    requests.push(args);
    return new Response(null, { status: 200 });
  });
  await update();
  assert.deepEqual(requests, [["/api/embed", { method: "POST" }]]);
  assert.deepEqual(statuses, ["running", "done"]);
});

test("permits another retry after HTTP failures and recovers when the service succeeds", async () => {
  const statuses = [];
  const responses = [503, 503, 200];
  const update = createProfileMatchUpdater((status) => statuses.push(status), async () =>
    new Response(null, { status: responses.shift() }),
  );
  await update();
  await update(true);
  await update(true);
  assert.deepEqual(statuses, ["running", "failed", "retrying", "failed", "retrying", "done"]);
  assert.equal(responses.length, 0);
});

test("recovers from a rejected network request without resaving profile fields", async () => {
  const statuses = [];
  let calls = 0;
  const update = createProfileMatchUpdater((status) => statuses.push(status), async () => {
    if (++calls === 1) throw new TypeError("Network unavailable");
    return new Response(null, { status: 200 });
  });
  await update();
  await update(true);
  assert.deepEqual(statuses, ["running", "failed", "retrying", "done"]);
  assert.equal(calls, 2);
});

test("repeated retry clicks share the request already in flight", async () => {
  let finish;
  const response = new Promise((resolve) => { finish = resolve; });
  let calls = 0;
  const update = createProfileMatchUpdater(() => {}, async () => {
    calls++;
    return response;
  });
  const first = update(true);
  const repeated = update(true);
  assert.equal(repeated, first);
  finish(new Response(null, { status: 200 }));
  await first;
  assert.equal(calls, 1);
});

test("queues a new save update and ignores a superseded failure", async () => {
  const statuses = [];
  let finishFirst;
  const firstResponse = new Promise((resolve) => { finishFirst = resolve; });
  let calls = 0;
  const update = createProfileMatchUpdater((status) => statuses.push(status), async () => {
    calls++;
    return calls === 1 ? firstResponse : new Response(null, { status: 200 });
  });
  const first = update();
  await Promise.resolve();
  const latest = update();
  assert.equal(calls, 1);
  finishFirst(new Response(null, { status: 503 }));
  await Promise.all([first, latest]);
  assert.equal(calls, 2);
  assert.deepEqual(statuses, ["running", "running", "done"]);
});
