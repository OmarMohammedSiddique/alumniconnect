import assert from "node:assert/strict";
import test from "node:test";
import { updateMentorshipRequest } from "./mentorship-request.ts";

function client({ user = { id: "mentee-1" }, authError = null, result = { data: { id: "request-1" }, error: null }, thrown } = {}) {
  const calls = [];
  const query = {};
  for (const method of ["update", "eq", "select"]) {
    query[method] = (...args) => {
      calls.push([method, ...args]);
      return query;
    };
  }
  const finish = async () => {
    if (thrown) throw thrown;
    return result;
  };
  query.maybeSingle = finish;
  return {
    calls,
    getClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: authError }) },
      from: (table) => { calls.push(["from", table]); return query; },
      rpc: (...args) => { calls.push(["rpc", ...args]); return finish(); },
    }),
  };
}

test("rejects missing request IDs and invalid decisions without contacting the database", async () => {
  const getClient = async () => assert.fail("Unexpected client creation");
  for (const [id, decision] of [["", "cancel"], ["request-1", null]]) {
    assert.equal((await updateMentorshipRequest(getClient, id, decision)).ok, false);
  }
});

test("expired sessions cannot mutate requests", async () => {
  for (const options of [{ user: null }, { authError: { message: "Expired" } }]) {
    const db = client(options);
    const state = await updateMentorshipRequest(db.getClient, "request-1", "accept");
    assert.equal(state.ok, false);
    assert.match(state.error, /sign in again/);
    assert.deepEqual(db.calls, []);
  }
});

test("cancels only the signed-in Mentee's pending request and confirms a row was changed", async () => {
  const db = client();
  assert.deepEqual(await updateMentorshipRequest(db.getClient, "request-1", "cancel"), { ok: true, error: null });
  assert.deepEqual(db.calls, [
    ["from", "mentorship_requests"],
    ["update", { status: "cancelled" }],
    ["eq", "id", "request-1"],
    ["eq", "mentee_id", "mentee-1"],
    ["eq", "status", "pending"],
    ["select", "id"],
  ]);
});

test("a zero-row cancellation is reported as unavailable rather than successful", async () => {
  const db = client({ result: { data: null, error: null } });
  const state = await updateMentorshipRequest(db.getClient, "request-1", "cancel");
  assert.equal(state.ok, false);
  assert.match(state.error, /no longer pending or available/);
});

for (const decision of ["accept", "decline"]) {
  test(`${decision} uses the existing atomic response RPC`, async () => {
    const db = client({ result: { data: null, error: null } });
    assert.deepEqual(await updateMentorshipRequest(db.getClient, "request-1", decision), { ok: true, error: null });
    assert.deepEqual(db.calls, [["rpc", "respond_to_request", { p_request_id: "request-1", p_accept: decision === "accept" }]]);
  });
}

test("stale and inaccessible responses explain that the request needs refreshing", async () => {
  for (const message of ["request not found", "request is not pending", "only the recipient mentor can respond"]) {
    const db = client({ result: { error: { code: "P0001", message } } });
    const state = await updateMentorshipRequest(db.getClient, "request-1", "accept");
    assert.equal(state.ok, false);
    assert.match(state.error, /Refresh the page/);
  }
});

test("returned database errors stay retryable without exposing internal messages", async () => {
  for (const decision of ["cancel", "accept", "decline"]) {
    const db = client({ result: { error: { code: "42501", message: "Internal database details" } } });
    const state = await updateMentorshipRequest(db.getClient, "request-1", decision);
    assert.deepEqual(state, { ok: false, error: `We couldn't ${decision} this request. Please try again.` });
  }
});

test("network failures during mutations return actionable feedback", async () => {
  for (const decision of ["cancel", "accept", "decline"]) {
    const db = client({ thrown: new TypeError("Network unavailable") });
    const state = await updateMentorshipRequest(db.getClient, "request-1", decision);
    assert.equal(state.ok, false);
    assert.match(state.error, /Please try again/);
  }
});

test("client or session lookup failures also return feedback", async () => {
  for (const getClient of [
    async () => { throw new Error("Client unavailable"); },
    async () => ({ auth: { getUser: async () => { throw new Error("Auth unavailable"); } } }),
  ]) {
    const state = await updateMentorshipRequest(getClient, "request-1", "cancel");
    assert.equal(state.ok, false);
    assert.match(state.error, /Please try again/);
  }
});

test("a failed update can be retried successfully", async () => {
  const failing = client({ result: { error: { message: "Temporary outage" } } });
  assert.equal((await updateMentorshipRequest(failing.getClient, "request-1", "accept")).ok, false);
  const working = client();
  assert.deepEqual(await updateMentorshipRequest(working.getClient, "request-1", "accept"), { ok: true, error: null });
});
