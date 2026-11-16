import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseDemoSwitcher,
  demoDisplayName,
  isDemoRole,
  isDemoSwitcherEnabled,
  isFictionalDemoUser,
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
  assert.equal(demoDisplayName("Demo Mentor — Grace Wanjiku"), "Grace Wanjiku");
  assert.equal(demoDisplayName("Demo Mentee: Career Explorer"), "Career Explorer");
  assert.equal(demoDisplayName("Grace Wanjiku"), "Grace Wanjiku");
});
