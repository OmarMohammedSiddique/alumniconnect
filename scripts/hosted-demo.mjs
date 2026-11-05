// Explicitly approved fictional fixtures for the hosted academic prototype.
// Dry run: node scripts/hosted-demo.mjs
// Apply: node scripts/hosted-demo.mjs --apply --phase seed|embed|verify|requests
// Optional bootstrap: node --conditions=react-server --experimental-strip-types
// scripts/hosted-demo.mjs --apply --phase bootstrap (local inference, not hosted proof)
// Private generated sign-in details stay in an ignored mode-0600 file.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const project = "edxflusuysnzzbyfrpvs";
const service = `https://${project}.supabase.co`;
const app = "https://alumnikonneqt.com";
const marker = "alumnikonneqt-hosted-demo-v1";
const accessPath = new URL("../.env.hosted-demo-access.json", import.meta.url);
const phase = process.argv[process.argv.indexOf("--phase") + 1];
const seedSource = readFileSync(new URL("./seed-dev.mjs", import.meta.url), "utf8");
// Read only the trusted repository's existing fixture literal, never run its seeder.
const literal = seedSource.match(/const MENTORS = (\[[\s\S]*?\n\]);/);
assert.ok(literal, "Local fixture definition missing");
const originals = runInNewContext(`(${literal[1]})`, Object.create(null), { timeout: 1000 });
assert.equal(originals.length, 5);
const fixtures = originals.map(({ email, ...profile }) => ({
  key: email.split(".")[0], role: "mentor",
  profile: { ...profile, full_name: `Demo Mentor — ${profile.full_name}`,
    bio: `Fictional demonstration profile for the AlumniKonneQt academic prototype. ${profile.bio}` },
}));
fixtures.push({ key: "mentee", role: "mentee", profile: {
  full_name: "Demo Mentee — Career Explorer",
  headline: "Aspiring data engineer seeking career guidance",
  bio: "Fictional demonstration account for testing the academic prototype. Interested in data infrastructure, machine learning and professional development.",
  skills: ["Python", "SQL", "Public Speaking"], industry: "Technology", graduation_year: 2026,
} });
for (const item of fixtures) item.email = `alumnikonneqt-demo-${item.key}@example.test`;
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ project, app, fictionalMentors: 5, separateDemoMentee: true, phases: ["seed", "embed", "verify", "requests", "bootstrap", "recommendations"] }));
  process.exit(0);
}
assert.ok(["seed", "embed", "verify", "requests", "bootstrap", "recommendations"].includes(phase), "Choose an explicit phase");
const lookup = spawnSync("npx", ["supabase", "projects", "api-keys", "--project-ref", project, "--reveal", "-o", "json"], {
  encoding: "utf8", timeout: 30_000,
});
assert.equal(lookup.status, 0, "Authenticated CLI key lookup failed; credentials are never printed");
const keys = JSON.parse(lookup.stdout);
const adminKey = keys.find((key) => key.name === "service_role")?.api_key;
const publicKey = keys.find((key) => key.name === "anon")?.api_key;
assert.ok(adminKey && publicKey, "Expected project keys unavailable");
const options = { auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }) } };
const admin = createClient(service, adminKey, options);
let access = existsSync(accessPath) ? JSON.parse(readFileSync(accessPath, "utf8")) : { project, marker, accounts: {} };
assert.equal(access.project, project);
assert.equal(access.marker, marker);
function saveAccess() {
  writeFileSync(accessPath, JSON.stringify(access, null, 2), { mode: 0o600 });
  chmodSync(accessPath, 0o600);
}
function checked(result, label) {
  if (result.error) throw new Error(`${label} failed (${result.error.code ?? result.error.status ?? "provider error"})`);
  return result.data;
}
const sessions = new Map();
async function login(item) {
  if (sessions.has(item.key)) return sessions.get(item.key);
  const record = access.accounts[item.key];
  assert.ok(record?.id && record.password, "Private demo sign-in record missing");
  const jar = new Map();
  const sdk = createServerClient(service, publicKey, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (entries) => entries.forEach(({ name, value }) => jar.set(name, value)) },
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
  });
  const signedIn = checked(await sdk.auth.signInWithPassword({ email: item.email, password: record.password }), "Demo sign-in");
  assert.equal(signedIn.user.id, record.id);
  assert.equal(signedIn.user.app_metadata.fixture, marker);
  const session = { sdk, jar, id: record.id };
  sessions.set(item.key, session);
  return session;
}
async function api(item, path) {
  const { jar } = await login(item);
  const started = performance.now();
  const response = await fetch(`${app}${path}`, { method: "POST", cache: "no-store",
    headers: { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; ") },
    signal: AbortSignal.timeout(80_000) });
  let body;
  try { body = await response.json(); } catch { throw new Error(`${path} returned a non-JSON response (${response.status})`); }
  console.log(JSON.stringify({ phase, fixture: item.key, path, status: response.status, elapsedMs: Math.round(performance.now() - started),
    ...(body.error ? { error: body.error } : {}) }));
  assert.ok(response.ok, `${path} failed (${response.status})`);
  return body;
}
try {
  if (phase === "seed") {
    const users = checked(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "Account inventory").users;
    for (const item of fixtures) {
      let user = users.find((user) => user.email === item.email);
      if (user) {
        assert.equal(user.app_metadata.fixture, marker, "Refusing to overwrite an unmarked account");
        assert.equal(access.accounts[item.key]?.id, user.id, "Existing fixture lacks its private access record");
      } else {
        const password = `${randomBytes(32).toString("base64url")}Aa1!`;
        user = checked(await admin.auth.admin.createUser({ email: item.email, password, email_confirm: true,
          app_metadata: { fixture: marker, fictional: true }, user_metadata: { role: item.role, full_name: item.profile.full_name } }), "Create fictional account").user;
        access.accounts[item.key] = { id: user.id, email: item.email, password, role: item.role };
        saveAccess();
      }
      const profile = checked(await admin.from("profiles").update({ ...item.profile, accepting_requests: true })
        .eq("id", user.id).eq("role", item.role).select("id,role,full_name").single(), "Save fictional profile");
      assert.equal(profile.role, item.role);
      console.log(`READY: ${item.profile.full_name}`);
    }
  } else if (phase === "bootstrap") {
    const { generateEmbedding, buildProfileEmbeddingText, MODEL_ID } = await import("../lib/embedding/embed.ts");
    for (const item of fixtures) {
      const id = access.accounts[item.key]?.id;
      const user = checked(await admin.auth.admin.getUserById(id), "Check fixture ownership").user;
      assert.equal(user.app_metadata.fixture, marker, "Only marked fictional fixtures may be embedded");
      const snapshot = checked(await admin.from("profiles").select("headline,bio,skills,industry,graduation_year,updated_at")
        .eq("id", id).single(), "Read demo snapshot");
      const vector = await generateEmbedding(buildProfileEmbeddingText(snapshot));
      assert.equal(vector.length, 384);
      assert.ok(vector.every(Number.isFinite));
      checked(await admin.from("profiles").update({ embedding: JSON.stringify(vector) }).eq("id", id)
        .eq("updated_at", snapshot.updated_at).select("id").single(), "Persist locally generated demo vector");
      console.log(JSON.stringify({ fixture: item.key, model: MODEL_ID, dimensions: vector.length, provenance: "local inference, hosted storage" }));
    }
  } else if (phase === "embed") {
    for (const item of fixtures) {
      const body = await api(item, "/api/embed");
      assert.equal(body.ok, true);
      assert.equal(body.dimensions, 384);
    }
  } else if (phase === "requests") {
    const mentee = await login(fixtures.find((item) => item.role === "mentee"));
    const mentor = await login(fixtures.find((item) => item.key === "grace"));
    const otherMentor = await login(fixtures.find((item) => item.key === "brian"));
    const message = "Fictional demonstration request — hosted workflow verification.";
    const existing = checked(await mentee.sdk.from("mentorship_requests").select("id,status,message")
      .eq("mentee_id", mentee.id).eq("mentor_id", mentor.id).in("status", ["pending", "accepted"]).maybeSingle(), "Find demo request");
    let request = existing;
    if (!request) request = checked(await mentee.sdk.from("mentorship_requests").insert({
      mentee_id: mentee.id, mentor_id: mentor.id, message,
    }).select("id,status,message").single(), "Send demo mentorship request");
    assert.equal(request.message, message, "Refusing to change an unrelated request");
    if (request.status === "pending") {
      const forbidden = await otherMentor.sdk.rpc("respond_to_request", { p_request_id: request.id, p_accept: true });
      assert.ok(forbidden.error, "Another mentor must not accept this request");
      checked(await mentor.sdk.rpc("respond_to_request", { p_request_id: request.id, p_accept: true }), "Accept demo request as recipient");
    }
    const saved = checked(await mentee.sdk.from("mentorship_requests").select("status")
      .eq("id", request.id).single(), "Read persisted demo request");
    assert.equal(saved.status, "accepted");
    checked(await mentee.sdk.from("connections").select("id")
      .eq("mentor_id", mentor.id).eq("mentee_id", mentee.id).single(), "Read persisted demo connection");
    const response = await fetch(`${app}/requests`, { headers: {
      Cookie: [...mentee.jar].map(([key, value]) => `${key}=${value}`).join("; "),
    }, signal: AbortSignal.timeout(20_000) });
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes("Demo Mentor"), "Requests page must render the demo relationship");
    console.log("PASS: authenticated demo request, recipient acceptance, wrong-recipient rejection, connection persistence and requests-page HTTP rendering");
  } else {
    const mentee = fixtures.find((item) => item.role === "mentee");
    if (phase === "verify") {
      const compare = await api(mentee, "/api/match/compare");
      assert.equal(compare.candidateCount, 5);
      assert.equal(compare.models.length, 2);
      for (const model of compare.models) {
        console.log(JSON.stringify({ model: model.id, dimensions: model.dimensions, elapsedMs: model.elapsedMs, results: model.matches.length, ...(model.error ? { error: model.error } : {}) }));
      }
      for (const model of compare.models) {
        assert.ok(!model.error, `${model.name} reported an inference error`);
        assert.equal(model.matches.length, 5);
        assert.ok(model.matches.every((match) => match.full_name.startsWith("Demo Mentor — ")));
      }
    }
    const ranked = await api(mentee, "/api/match");
    assert.equal(ranked.matches.length, 5);
    const { sdk } = await login(mentee);
    const found = checked(await sdk.rpc("search_mentors", { search_query: "Python", match_count: 20 }), "Hosted keyword search");
    assert.equal(found.length, 2);
    console.log(`PASS: hosted ${phase === "verify" ? "comparison, " : ""}recommendations and keyword search over the labelled demo pool`);
  }
} finally {
  for (const { sdk } of sessions.values()) await sdk.auth.signOut();
}
