import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { getPasswordError } from "./signup-validation.ts";
import { getSafeSignInRedirect } from "./auth-redirect.ts";
import * as turnstile from "./turnstile.ts";

const source = readFileSync(new URL("../app/(auth)/actions.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadActions({ confirmationEnabled = false, session = null } = {}) {
  const exports = {};
  const cookies = [];
  const dependencies = {
    "next/headers": { cookies: async () => ({ set: (...args) => cookies.push(args) }) },
    "next/navigation": { redirect: (path) => { throw Object.assign(new Error("redirect"), { path }); } },
    "@/lib/supabase/server": { createClient: async () => ({ auth: {
      signUp: async () => ({ data: { session }, error: null }),
      signInWithPassword: async () => ({ error: null }),
    } }) },
    "@/lib/account-email": { ACCOUNT_EMAIL_FLOW: { signup: { cookie: "confirmation", path: "/verify-email" } }, ACCOUNT_EMAIL_SECONDS: 600 },
    "@/lib/email-otp": { normalizeOtpEmail: (value) => String(value ?? "").trim().toLowerCase() },
    "@/lib/profile-name": { formatFullName: (value) => value.trim() },
    "@/lib/registration-privacy": { getIdentityCollectionError: () => null },
    "@/lib/signup-validation": { getPasswordError },
    "@/lib/auth-redirect": { getSafeSignInRedirect },
    "@/lib/turnstile": turnstile,
  };
  runInNewContext(code, {
    exports, require: (name) => dependencies[name] ?? {}, FormData, File,
    process: { env: { ACCOUNT_EMAIL_ENABLED: String(confirmationEnabled), NODE_ENV: "development" } },
  });
  return { actions: exports, cookies };
}

function registrationData() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    first_name: "Arrival", last_name: "Fixture", email: "arrival@example.test",
    password: "ValidTest123!", confirm_password: "ValidTest123!", role: "mentee",
  })) data.set(key, value);
  return data;
}

for (const confirmationEnabled of [false, true]) {
  test(`signup arrival does not claim a session when confirmation is required (codes ${confirmationEnabled})`, async () => {
    const { actions, cookies } = loadActions({ confirmationEnabled });
    const result = await actions.signUpWithArrival({ error: null }, registrationData());
    assert.equal(result.error, null);
    assert.equal(result.confirmationRequired, true);
    assert.equal(result.confirmationCodeEnabled, confirmationEnabled);
    assert.equal(result.redirectTo, undefined);
    assert.equal(cookies.length, confirmationEnabled ? 1 : 0);
  });
}

test("login arrival returns only a safe destination and preserves legacy redirects", async () => {
  const { actions } = loadActions();
  for (const [next, expected] of [["https://outside.example", "/discover"], ["//outside.example", "/discover"], ["/requests", "/requests"]]) {
    const data = new FormData();
    data.set("next", next);
    const result = await actions.signInWithArrival({ error: null }, data);
    assert.equal(result.redirectTo, expected);
    await assert.rejects(actions.signIn({ error: null }, data), (error) => error.path === expected);
  }
});

test("signup with a real session retains the profile destination and confirmation validation", async () => {
  const { actions } = loadActions({ session: {} });
  const result = await actions.signUpWithArrival({ error: null }, registrationData());
  assert.equal(result.redirectTo, "/profile");
  assert.equal(result.confirmationRequired, undefined);
  const missingConfirmation = registrationData();
  missingConfirmation.delete("confirm_password");
  const rejected = await actions.signUpWithArrival({ error: null }, missingConfirmation);
  assert.ok(rejected.error);
  assert.equal(rejected.redirectTo, undefined);
});
