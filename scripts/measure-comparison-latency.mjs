// Local-only response-time sample for the model comparison route.
// node --env-file=.env.local --experimental-strip-types scripts/measure-comparison-latency.mjs [requests]
// Each disposable account makes two requests (the route allows three per window), so the
// default of 24 requests uses 12 accounts. Accounts are deleted afterwards.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const appUrl = new URL(process.env.COMPARISON_APP_URL ?? "http://localhost:3000");
const dbUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
for (const url of [appUrl, dbUrl]) {
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Local targets only");
  assert.equal(url.protocol, "http:");
}
const total = Number(process.argv[2] ?? 24);
const admin = createClient(dbUrl.href, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
const samples = [];
const percentile = (values, share) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * share))];
try {
  for (let index = 0; samples.length < total; index++) {
    const email = `latency-${randomUUID()}@example.test`;
    const password = `${randomUUID()}Aa1!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { role: "mentee", full_name: `Latency ${index}` } });
    assert.ok(!created.error);
    users.push(created.data.user.id);
    await admin.from("profiles").update({ headline: "Graduate looking for logistics and aviation guidance",
      bio: "I want to learn how freight planning and aircraft maintenance scheduling work in practice.",
      skills: ["Planning", "Spreadsheets"], industry: "Logistics" }).eq("id", created.data.user.id);
    const cookies = new Map();
    const sdk = createServerClient(dbUrl.href, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)) },
      auth: { autoRefreshToken: false },
    });
    assert.ok(!(await sdk.auth.signInWithPassword({ email, password })).error);
    const headers = { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") };
    for (let repeat = 0; repeat < 2 && samples.length < total; repeat++) {
      const started = performance.now();
      const response = await fetch(new URL("/api/match/compare", appUrl), { method: "POST", headers });
      const body = await response.json();
      assert.equal(response.status, 200);
      const scratch = body.models.find((model) => model.id.startsWith("scratch-"));
      const minilm = body.models.find((model) => !model.id.startsWith("scratch-"));
      assert.ok(!scratch.error && !minilm.error);
      samples.push({ http: Math.round(performance.now() - started), scratch: scratch.elapsedMs, minilm: minilm.elapsedMs,
        candidates: body.candidateCount, version: scratch.id });
    }
  }
  const summary = (key) => ({ first: samples[0][key], median: percentile(samples.slice(1).map((s) => s[key]), 0.5),
    p95: percentile(samples.slice(1).map((s) => s[key]), 0.95), max: Math.max(...samples.slice(1).map((s) => s[key])) });
  console.log(JSON.stringify({ requests: samples.length, candidates: samples[0].candidates, version: samples[0].version,
    note: "first = first request after server start (includes model loading); other figures leave it out; milliseconds",
    scratch_model: summary("scratch"), minilm: summary("minilm"), whole_request: summary("http") }, null, 1));
} finally {
  for (const id of users.reverse()) await admin.auth.admin.deleteUser(id);
  console.log("Disposable latency accounts cleaned up");
}
