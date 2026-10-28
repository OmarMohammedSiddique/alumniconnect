// Local integration coverage. Browser interactions are verified separately.
// Run a freshly built app first, then: npm run smoke:local
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import nextActionClient from "next/dist/compiled/react-server-dom-turbopack/client.node.js";

// These HTTP checks use the installed Next 16 action encoder and current build
// references, never hard-coded action IDs. Start the matching production build.
const { encodeReply } = nextActionClient;
const actions = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;

const appUrl = new URL(process.env.SMOKE_APP_URL ?? "http://localhost:3002");
const databaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
for (const url of [appUrl, databaseUrl]) {
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "Smoke tests require loopback targets");
  assert.equal(url.protocol, "http:", "Smoke tests require local HTTP");
  assert.ok(!url.username && !url.password && url.pathname === "/" && !url.search && !url.hash);
}
assert.equal(databaseUrl.port, "54321", "Expected the AlumniConnect local API port");
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
assert.ok(!Object.keys(process.env).some(key => key.startsWith("NEXT_PUBLIC_") && /SERVICE_ROLE|SECRET/.test(key)));

const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(databaseUrl.href, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const run = randomUUID();
const users = [];
let passed = 0;

function pass(label) {
  passed++;
  console.log(`PASS ${passed}: ${label}`);
}

function expectOk(result, label) {
  // SDK messages can contain account data, so keep failure output generic.
  assert.ok(!result.error, label);
  return result.data;
}

async function action(cookies, name, path, fields, previous = { error: null, ok: false }) {
  const entry = Object.entries(actions).find(([, entry]) => entry.exportedName === name);
  assert.ok(entry, `Build must export ${name}`);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, String(value));
  const body = await encodeReply(name === "signOut" ? [] : [previous, form]);
  const response = await fetch(new URL(path, appUrl), {
    method: "POST", redirect: "manual", body,
    headers: {
      Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      "Next-Action": entry[0], Origin: appUrl.origin, Accept: "text/x-component",
    },
    signal: AbortSignal.timeout(30_000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  const text = await response.text();
  assert.ok(response.ok || response.status === 303, `${name} HTTP request failed`);
  const redirect = response.headers.get("x-action-redirect");
  if (redirect) return { redirect };
  // Read only the action's JSON state, not the accompanying rendered UI tree.
  const rows = new Map([...text.matchAll(/^([\da-f]+):(.+)$/gm)].map(([, key, value]) => [key, value]));
  const root = JSON.parse(rows.get("0"));
  assert.ok(typeof root.a === "string" && root.a.startsWith("$@"), "Next action return reference missing");
  return JSON.parse(rows.get(root.a.slice(2)));
}

async function account(role, label) {
  const cookies = new Map();
  const sdk = createServerClient(databaseUrl.href, publicKey, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: entries => entries.forEach(({ name, value }) => cookies.set(name, value)),
    },
    auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: false },
  });
  const email = `smoke-${run}-${label}@example.test`;
  const password = `${randomUUID()}aA1!`;
  const result = await action(cookies, "signUp", "/signup", {
    email, password, role, full_name: `smoke ${label.toLowerCase()}`,
  }, { error: null });
  const data = expectOk(await sdk.auth.getUser(), "Local signup session missing");
  assert.ok(data.user?.id, "Signup must create a user");
  // Register cleanup before further assertions about the new account.
  users.push(data.user.id);
  assert.equal(result.redirect, "/profile;push", "Local signup must redirect to profile");
  const headers = () => ({ Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") });
  async function api(path, body) {
    const response = await fetch(new URL(path, appUrl), {
      method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(120_000),
    });
    const value = await response.json();
    return { status: response.status, value };
  }
  return { sdk, id: data.user.id, email, password, api, headers,
    action: (name, path, fields, previous) => action(cookies, name, path, fields, previous),
  };
}

function update(person, id, decision) {
  return person.action(decision === "cancel" ? "cancelRequest" : "respondRequest", "/requests", {
    request_id: id, ...(decision !== "cancel" ? { accept: decision === "accept" } : {}),
  });
}

async function readRequest(id) {
  return expectOk(await admin.from("mentorship_requests").select("status").eq("id", id).single(), "Read fixture request");
}

async function connectionCount(mentee, mentor) {
  const data = expectOk(await admin.from("connections").select("id").eq("mentee_id", mentee.id).eq("mentor_id", mentor.id), "Read fixture connections");
  return data.length;
}

try {
  const settings = await fetch(new URL("/auth/v1/settings", databaseUrl), {
    headers: { apikey: publicKey }, signal: AbortSignal.timeout(10_000),
  });
  assert.equal(settings.status, 200, "Local auth settings must be reachable");
  assert.equal((await settings.json()).mailer_autoconfirm, true, "Smoke tests require the existing local auto-confirm setting; never change hosted settings for this test");
  const unsigned = await fetch(new URL("/profile", appUrl), { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  assert.equal(unsigned.status, 307);
  assert.equal(new URL(unsigned.headers.get("location"), appUrl).pathname, "/login");
  for (const path of ["/api/embed", "/api/match"]) {
    assert.equal((await fetch(new URL(path, appUrl), { method: "POST" })).status, 401);
  }
  pass("unsigned-in profile and API access is blocked");

  const invalidSignup = await action(new Map(), "signUp", "/signup", {
    email: `smoke-${run}-invalid@example.test`, password: "too-short", full_name: "Smoke Invalid", role: "admin",
  }, { error: null });
  assert.deepEqual(invalidSignup, { error: "Invalid role." });
  pass("signup server action rejects self-assigned staff roles before account creation");

  const mentee = await account("mentee", "Mentee");
  const mentor = await account("mentor", "Mentor");
  const stranger = await account("mentee", "Stranger");
  const hidden = await account("mentor", "Hidden");
  for (const person of [mentee, mentor, stranger, hidden]) {
    const profile = expectOk(await person.sdk.from("profiles").select("role, full_name").eq("id", person.id).single(), "Signup profile missing");
    assert.equal(profile.role, person === mentor || person === hidden ? "mentor" : "mentee");
    assert.ok(profile.full_name.startsWith("Smoke "));
  }
  pass("signup server action creates all four profiles, formats names and issues working sessions");

  assert.equal((await mentee.api("/api/match")).status, 422);
  assert.equal((await mentee.api("/api/embed")).status, 422);
  pass("empty profiles return actionable 422 states before first embedding");

  const details = {
    headline: "Software engineer and career Mentor",
    bio: "Building reliable web applications and helping developers grow their Python and SQL skills.",
    skills: ["Python", "SQL"], industry: "Technology", graduation_year: 2020,
  };
  for (const person of [mentee, mentor]) {
    const saved = await person.action("updateProfile", "/profile", {
      ...details, full_name: "smoke profile", skills: "Python, SQL, python",
    }, { error: null, saved: false });
    assert.deepEqual(saved, { error: null, saved: true, fullName: "Smoke Profile" });
    const result = await person.api("/api/embed");
    assert.equal(result.status, 200, "Real embedding endpoint must succeed");
    assert.deepEqual(result.value, { ok: true, dimensions: 384 });
    const stored = expectOk(await admin.from("profiles").select("embedding").eq("id", person.id).single(), "Read fixture embedding");
    const vector = JSON.parse(stored.embedding);
    assert.equal(vector.length, 384);
    assert.ok(vector.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...vector) - 1) < 0.001);
  }
  pass("saved structured profiles produce stored, finite, normalized 384-value vectors through /api/embed");

  const invalidProfile = await mentee.action("updateProfile", "/profile", {
    ...details, full_name: "Smoke Profile", skills: "Python, SQL", graduation_year: 1900,
  }, { error: null, saved: false });
  assert.deepEqual(invalidProfile, { error: "Enter a valid graduation year.", saved: false });
  const stillSaved = expectOk(await mentee.sdk.from("profiles").select("graduation_year, skills").eq("id", mentee.id).single(), "Read saved profile after invalid input");
  assert.equal(stillSaved.graduation_year, details.graduation_year);
  assert.deepEqual(stillSaved.skills, ["Python", "SQL"]);
  pass("invalid profile input leaves saved data intact; valid saves deduplicate skills");

  expectOk(await admin.from("profiles").update({ ...details, is_visible: false }).eq("id", hidden.id), "Hide fixture mentor");
  assert.equal((await hidden.api("/api/embed")).status, 200);
  const matches = await mentee.api("/api/match", { count: 50 });
  assert.equal(matches.status, 200);
  const match = matches.value.matches.find(row => row.id === mentor.id);
  assert.ok(match, "Fixture mentor must appear in real ranking results");
  assert.ok(Number.isFinite(match.similarity) && match.similarity > 0.99);
  assert.deepEqual(match.shared_skills.sort(), ["Python", "SQL"]);
  assert.ok(!matches.value.matches.some(row => [mentee.id, hidden.id].includes(row.id)));
  const search = expectOk(await mentee.sdk.rpc("search_mentors", { search_query: "Python", match_count: 50 }), "Keyword discovery failed");
  assert.ok(search.some(row => row.id === mentor.id));
  assert.ok(!search.some(row => row.id === hidden.id));
  pass("real pgvector matching and keyword discovery find the visible mentor and shared skills");

  const escalation = await mentee.sdk.from("profiles").update({ role: "admin" }).eq("id", mentee.id);
  assert.ok(escalation.error);
  const embeddingWrite = await mentee.sdk.from("profiles").update({ embedding: JSON.stringify(Array(384).fill(1)) }).eq("id", mentee.id);
  assert.ok(embeddingWrite.error);
  const otherWrite = await stranger.sdk.from("profiles").update({ headline: "Unauthorized" }).eq("id", mentee.id).select("id");
  assert.equal(expectOk(otherWrite, "Third-party update probe failed").length, 0);
  const blockedHidden = await mentee.sdk.from("mentorship_requests").insert({ mentee_id: mentee.id, mentor_id: hidden.id });
  assert.ok(blockedHidden.error);
  pass("role escalation, client embedding writes, other-profile edits and hidden-mentor requests are blocked");

  const create = async () => {
    assert.deepEqual(await mentee.action("createRequest", "/discover", {
      mentor_id: mentor.id, message: "Synthetic local workflow check.",
    }), { ok: true, error: null });
    return expectOk(await mentee.sdk.from("mentorship_requests").select("id")
      .eq("mentee_id", mentee.id).eq("mentor_id", mentor.id).eq("status", "pending").single(), "Read pending request").id;
  };
  const requestId = await create();
  const anonymous = createClient(databaseUrl.href, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonymousResponse = await anonymous.rpc("respond_to_request", { p_request_id: requestId, p_accept: true });
  assert.equal(anonymousResponse.error?.code, "42501");
  assert.equal((await readRequest(requestId)).status, "pending");
  assert.equal(await connectionCount(mentee, mentor), 0);
  const duplicate = await mentee.sdk.from("mentorship_requests").insert({ mentee_id: mentee.id, mentor_id: mentor.id });
  assert.equal(duplicate.error?.code, "23505");
  const duplicateAction = await mentee.action("createRequest", "/discover", { mentor_id: mentor.id });
  assert.deepEqual(duplicateAction, { ok: false, error: "You already have a pending request to this mentor." });
  assert.equal(expectOk(await mentor.sdk.from("mentorship_requests").select("id").eq("id", requestId), "Mentor request read").length, 1);
  assert.equal(expectOk(await stranger.sdk.from("mentorship_requests").select("id").eq("id", requestId), "Stranger request read").length, 0);
  assert.equal((await update(stranger, requestId, "accept")).ok, false);
  assert.equal((await readRequest(requestId)).status, "pending");
  pass("party-only request visibility; duplicates, anonymous RPC calls and non-recipient responses are blocked");

  assert.deepEqual(await update(mentor, requestId, "accept"), { ok: true, error: null });
  assert.equal((await readRequest(requestId)).status, "accepted");
  assert.equal(await connectionCount(mentee, mentor), 1);
  for (const person of [mentee, mentor]) {
    assert.equal(expectOk(await person.sdk.from("connections").select("id").eq("request_id", requestId), "Party connection read").length, 1);
    const page = await fetch(new URL("/requests", appUrl), { headers: person.headers() });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes("Your connections") && html.includes("Accepted"));
  }
  assert.equal(expectOk(await stranger.sdk.from("connections").select("id").eq("request_id", requestId), "Third-party connection read").length, 0);
  assert.equal((await update(mentor, requestId, "accept")).ok, false);
  assert.equal(await connectionCount(mentee, mentor), 1);
  pass("recipient acceptance creates one persisted connection; repeat acceptance is rejected");

  const declined = await create();
  assert.equal((await update(mentor, declined, "decline")).ok, true);
  assert.equal((await readRequest(declined)).status, "declined");
  assert.equal(await connectionCount(mentee, mentor), 1);
  const cancelled = await create();
  assert.equal((await update(stranger, cancelled, "cancel")).ok, false);
  assert.equal((await update(mentee, cancelled, "cancel")).ok, true);
  assert.equal((await readRequest(cancelled)).status, "cancelled");
  assert.equal((await update(mentee, cancelled, "cancel")).ok, false);
  assert.equal((await update(mentor, cancelled, "accept")).ok, false);
  pass("decline, owner-only cancellation and stale-action recovery preserve connection integrity");

  assert.equal((await mentee.action("signOut", "/requests", {})).redirect, "/login;push");
  assert.equal((await mentee.api("/api/match")).status, 401);
  assert.equal((await mentee.action("signIn", "/login", {
    email: mentee.email, password: mentee.password,
  }, { error: null })).redirect, "/discover;push");
  const restored = expectOk(await mentee.sdk.from("profiles").select("headline, skills").eq("id", mentee.id).single(), "Read saved profile after re-login");
  assert.equal(restored.headline, details.headline);
  assert.deepEqual(restored.skills, details.skills);
  assert.equal((await mentee.api("/api/match")).status, 200);
  assert.equal(await connectionCount(mentee, mentor), 1);
  pass("logout removes access; login restores saved profile, matches and connection");
} finally {
  const errors = [];
  for (const id of users.toReversed()) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) errors.push("Temporary auth account cleanup failed");
  }
  if (users.length) {
    for (const [table, column] of [["profiles", "id"], ["mentorship_requests", "mentee_id"], ["mentorship_requests", "mentor_id"], ["connections", "mentee_id"], ["connections", "mentor_id"]]) {
      const result = await admin.from(table).select("id").in(column, users);
      if (result.error || result.data.length) errors.push(`Temporary ${table} cleanup failed`);
    }
  }
  assert.deepEqual(errors, [], "Cleanup must remove only this run's fixtures");
  console.log(`CLEANUP PASS: ${users.length} temporary accounts removed; no fixture profiles, requests or connections remain.`);
}
console.log(`LOCAL INTEGRATION PASS: ${passed} checks. No browser, hosted, model-training or Supabase-restart claim.`);
