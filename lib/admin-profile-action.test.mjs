import assert from "node:assert/strict";
import test from "node:test";
import { changeProfileRole, changeProfileVisibility } from "./admin-profile-action.ts";

const TARGET = "00000000-0000-0000-0000-000000000002";
const ADMIN = "00000000-0000-0000-0000-000000000005";

function client({ user = { id: ADMIN }, authError = null, result, thrown } = {}) {
  const calls = [];
  const query = {};
  for (const method of ["update", "eq", "select"]) {
    query[method] = (...args) => {
      calls.push([method, ...args]);
      return query;
    };
  }
  query.maybeSingle = async () => {
    if (thrown) throw thrown;
    return result;
  };
  return {
    calls,
    getClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: authError }) },
      from: (table) => { calls.push(["from", table]); return query; },
    }),
  };
}

const neverCalled = async () => assert.fail("Unexpected client creation");

test("rejects malformed role input without contacting the database", async () => {
  for (const [id, role] of [
    ["", "mentor"],
    ["not-a-uuid", "mentor"],
    [`${TARGET}' or 1=1`, "mentor"],
    [null, "mentor"],
    [TARGET, "superuser"],
    [TARGET, ""],
    [TARGET, null],
  ]) {
    const state = await changeProfileRole(neverCalled, id, role);
    assert.equal(state.ok, false);
    assert.ok(state.error);
  }
});

test("rejects malformed visibility input without contacting the database", async () => {
  for (const [id, visible] of [["bad", "true"], [TARGET, "yes"], [TARGET, ""], [TARGET, null], [TARGET, "TRUE"]]) {
    const state = await changeProfileVisibility(neverCalled, id, visible);
    assert.equal(state.ok, false);
    assert.ok(state.error);
  }
});

test("signed-out or expired sessions cannot change roles or visibility", async () => {
  for (const options of [{ user: null }, { authError: { message: "JWT expired" } }]) {
    const db = client(options);
    assert.equal((await changeProfileRole(db.getClient, TARGET, "mentor")).ok, false);
    assert.equal((await changeProfileVisibility(db.getClient, TARGET, "false")).ok, false);
    assert.deepEqual(db.calls, []);
  }
});

test("admins cannot change their own role from the admin page", async () => {
  const db = client({ user: { id: TARGET } });
  const state = await changeProfileRole(db.getClient, TARGET, "mentee");
  assert.equal(state.ok, false);
  assert.deepEqual(db.calls, []);
});

test("a persisted role change reports success and keeps RLS-scoped update", async () => {
  const db = client({ result: { data: { id: TARGET, role: "moderator" }, error: null } });
  const state = await changeProfileRole(db.getClient, TARGET, "moderator");
  assert.deepEqual(state, { ok: true, error: null, message: "Role changed to moderator." });
  assert.deepEqual(db.calls, [
    ["from", "profiles"],
    ["update", { role: "moderator" }],
    ["eq", "id", TARGET],
    ["select", "id, role"],
  ]);
});

test("a persisted visibility change reports success", async () => {
  const db = client({ result: { data: { id: TARGET, is_visible: false }, error: null } });
  const state = await changeProfileVisibility(db.getClient, TARGET, "false");
  assert.equal(state.ok, true);
  assert.match(state.message, /hidden/);
  assert.deepEqual(db.calls[1], ["update", { is_visible: false }]);
});

test("updates that affect no permitted row are reported as stale, not success", async () => {
  const db = client({ result: { data: null, error: null } });
  for (const state of [
    await changeProfileRole(db.getClient, TARGET, "mentor"),
    await changeProfileVisibility(db.getClient, TARGET, "true"),
  ]) {
    assert.equal(state.ok, false);
    assert.match(state.error, /no longer/);
  }
});

test("a returned row that does not reflect the request is not reported as success", async () => {
  const role = client({ result: { data: { id: TARGET, role: "mentee" }, error: null } });
  assert.equal((await changeProfileRole(role.getClient, TARGET, "admin")).ok, false);
  const visibility = client({ result: { data: { id: TARGET, is_visible: true }, error: null } });
  assert.equal((await changeProfileVisibility(visibility.getClient, TARGET, "false")).ok, false);
});

test("trigger and RLS rejections map to a safe permission message", async () => {
  for (const error of [
    { code: "P0001", message: "only admins can change roles" },
    { code: "P0001", message: "only moderators or admins can change visibility" },
    { code: "P0001", message: "only moderators or admins can change staff moderation status" },
    { code: "P0001", message: "cannot edit another member profile" },
    { code: "42501", message: "new row violates row-level security policy" },
  ]) {
    const db = client({ result: { data: null, error } });
    const role = await changeProfileRole(db.getClient, TARGET, "admin");
    const visibility = await changeProfileVisibility(db.getClient, TARGET, "true");
    for (const state of [role, visibility]) {
      assert.equal(state.ok, false);
      assert.match(state.error, /permission/);
      assert.doesNotMatch(state.error, /only admins|row-level|P0001|42501/);
    }
  }
});

test("database and network failures produce a retryable message without internal details", async () => {
  const cases = [
    { result: { data: null, error: { code: "PGRST000", message: "connection to server at 10.0.0.1 failed" } } },
    { thrown: new TypeError("fetch failed") },
  ];
  for (const options of cases) {
    const db = client(options);
    const role = await changeProfileRole(db.getClient, TARGET, "mentor");
    const visibility = await changeProfileVisibility(db.getClient, TARGET, "false");
    for (const state of [role, visibility]) {
      assert.equal(state.ok, false);
      assert.match(state.error, /try again/);
      assert.doesNotMatch(state.error, /10\.0\.0\.1|fetch failed|PGRST/);
    }
  }
});
