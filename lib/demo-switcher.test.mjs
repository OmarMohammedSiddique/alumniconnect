import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseDemoSwitcher,
  demoDisplayName,
  isDemoRole,
  isDemoSwitcherEnabled,
  isFictionalDemoUser,
  isUsableDemoKey,
  runDemoSwitch,
  sortDemoAccounts,
} from "./demo-switcher.ts";

const demo = { id: "d1", email: "demo@example.test", app_metadata: { fictional: true } };
const real = { id: "r1", email: "member@example.org", app_metadata: { provider: "email" } };

test("the switcher is off unless the setting is exactly true", () => {
  assert.equal(isDemoSwitcherEnabled("true"), true);
  assert.equal(isDemoSwitcherEnabled(" TRUE "), true);
  for (const value of [undefined, "", "false", "1", "yes", "enabled"]) {
    assert.equal(isDemoSwitcherEnabled(value), false, String(value));
  }
});

test("only accounts marked fictional in app metadata count as demo accounts", () => {
  assert.equal(isFictionalDemoUser(demo), true);
  assert.equal(isFictionalDemoUser(real), false);
  assert.equal(isFictionalDemoUser(null), false);
  assert.equal(isFictionalDemoUser({ id: "x", email: "a@b.test", app_metadata: { fictional: "true" } }), false);
  assert.equal(isFictionalDemoUser({ id: "x", email: "a@b.test", app_metadata: null }), false);
  assert.equal(isFictionalDemoUser({ id: "x", email: null, app_metadata: { fictional: true } }), false);
});

test("real members are never switched out of their own account", () => {
  assert.equal(canUseDemoSwitcher(null), true);
  assert.equal(canUseDemoSwitcher(demo), true);
  assert.equal(canUseDemoSwitcher(real), false);
});

test("staff roles cannot be demo targets", () => {
  assert.equal(isDemoRole("mentee"), true);
  assert.equal(isDemoRole("mentor"), true);
  for (const role of ["admin", "moderator", "", null, undefined]) {
    assert.equal(isDemoRole(role), false, String(role));
  }
});

test("demo accounts list the Mentee first, then Mentors by name", () => {
  const sorted = sortDemoAccounts([
    { id: "2", fullName: "Grace", role: "mentor", headline: "" },
    { id: "3", fullName: "Brian", role: "mentor", headline: "" },
    { id: "1", fullName: "Explorer", role: "mentee", headline: "" },
  ]);
  assert.deepEqual(sorted.map((a) => a.id), ["1", "3", "2"]);
});

test("hosted demo prefixes are removed from display names", () => {
  assert.equal(demoDisplayName("Demo Mentor \u2014 Grace Wanjiku"), "Grace Wanjiku");
  assert.equal(demoDisplayName("Demo Mentee: Career Explorer"), "Career Explorer");
  assert.equal(demoDisplayName("Grace Wanjiku"), "Grace Wanjiku");
});

const MENTOR_ID = "11111111-1111-4111-8111-111111111111";
const REAL_ID = "22222222-2222-4222-8222-222222222222";
const STAFF_ID = "33333333-3333-4333-8333-333333333333";
const users = {
  [MENTOR_ID]: { id: MENTOR_ID, email: "mentor@example.test", app_metadata: { fictional: true } },
  [REAL_ID]: { id: REAL_ID, email: "real@example.org", app_metadata: {} },
  [STAFF_ID]: { id: STAFF_ID, email: "staff@example.test", app_metadata: { fictional: true } },
};
const roles = { [MENTOR_ID]: "mentor", [REAL_ID]: "mentee", [STAFF_ID]: "admin" };

function deps(overrides = {}) {
  const calls = { issued: 0, exchanged: 0, lookups: 0 };
  return {
    calls,
    deps: {
      enabled: true,
      presenter: true,
      getCurrentUser: async () => null,
      getUserById: async (id) => { calls.lookups += 1; return users[id] ?? null; },
      getProfileRole: async (id) => roles[id],
      issueSignInToken: async () => { calls.issued += 1; return "hashed-token"; },
      exchangeSignInToken: async () => { calls.exchanged += 1; return true; },
      ...overrides,
    },
  };
}

test("a presenter can switch into a fictional Mentor", async () => {
  const { deps: d, calls } = deps();
  assert.deepEqual(await runDemoSwitch(d, MENTOR_ID), { ok: true, alreadyCurrent: false });
  assert.equal(calls.issued, 1);
  assert.equal(calls.exchanged, 1);
});

test("no sign-in token is ever issued for a refused switch", async () => {
  const cases = [
    ["setting off", { enabled: false }, MENTOR_ID],
    ["no presenter key", { presenter: false }, MENTOR_ID],
    ["malformed id", {}, "not-a-uuid"],
    ["real member target", {}, REAL_ID],
    ["staff target", {}, STAFF_ID],
    ["unknown target", {}, "44444444-4444-4444-8444-444444444444"],
    ["real member signed in", { getCurrentUser: async () => users[REAL_ID] }, MENTOR_ID],
  ];
  for (const [label, overrides, target] of cases) {
    const { deps: d, calls } = deps(overrides);
    const result = await runDemoSwitch(d, target);
    assert.equal(result.ok, false, label);
    assert.equal(calls.issued, 0, label);
    assert.equal(calls.exchanged, 0, label);
  }
});

test("the setting and presenter key are checked before any account lookup", async () => {
  for (const overrides of [{ enabled: false }, { presenter: false }]) {
    const { deps: d, calls } = deps(overrides);
    await runDemoSwitch(d, MENTOR_ID);
    assert.equal(calls.lookups, 0);
  }
});

test("a failed token exchange reports an error instead of claiming success", async () => {
  const { deps: d } = deps({ exchangeSignInToken: async () => false });
  const result = await runDemoSwitch(d, MENTOR_ID);
  assert.equal(result.ok, false);
});

test("switching to the current demo account is a no-op", async () => {
  const { deps: d, calls } = deps({ getCurrentUser: async () => users[MENTOR_ID] });
  assert.deepEqual(await runDemoSwitch(d, MENTOR_ID), { ok: true, alreadyCurrent: true });
  assert.equal(calls.issued, 0);
});

test("presenter keys must be long enough to resist guessing", () => {
  assert.equal(isUsableDemoKey(undefined), false);
  assert.equal(isUsableDemoKey("short"), false);
  assert.equal(isUsableDemoKey("a".repeat(16)), true);
});
