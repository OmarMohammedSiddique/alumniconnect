// Local-only live inference/permission checks with disposable accounts.
// node --env-file=.env.local --experimental-strip-types scripts/verify-model-comparison.mjs [--browser]
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { generateScratchEmbeddings } from "../lib/scratch-model.ts";
import { comparisonText, cosineSimilarity } from "../lib/model-comparison.ts";

const appUrl = new URL(process.env.COMPARISON_APP_URL ?? "http://localhost:3000");
const dbUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
for (const url of [appUrl, dbUrl]) {
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Local targets only");
  assert.equal(url.protocol, "http:");
}
assert.equal(dbUrl.port, "54321");
const admin = createClient(dbUrl.href, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
let browser;
function ok(response) {
  assert.ok(!response.error, `Local SDK operation failed (${response.error?.code ?? "unknown"})`);
  return response.data;
}
async function account(role, label, fields = {}) {
  const email = `comparison-${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa1!`;
  const { user } = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { role, full_name: `Comparison ${label}` } }));
  users.push(user.id);
  ok(await admin.from("profiles").update(fields).eq("id", user.id));
  const cookies = new Map();
  const sdk = createServerClient(dbUrl.href, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)) },
    auth: { autoRefreshToken: false },
  });
  ok(await sdk.auth.signInWithPassword({ email, password }));
  return { id: user.id, sdk, cookies,
    headers: () => ({ Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") }) };
}
async function compare(user) {
  const response = await fetch(new URL("/api/match/compare", appUrl), { method: "POST", headers: user?.headers() });
  return { response, body: await response.json() };
}
const profileFields = "id, full_name, headline, bio, skills, industry, graduation_year, accepting_requests";
try {
  assert.equal((await compare()).response.status, 401);
  const empty = await account("mentee", "empty");
  assert.equal((await compare(empty)).response.status, 422);
  const fields = { headline: "Looking for engineering career guidance", bio: "I want help learning aviation safety and logistics.",
    skills: ["Safety", "Engineering"], industry: "Aviation" };
  const viewer = await account("mentee", "viewer", fields);
  const mentor = await account("mentor", "mentor", { ...fields, headline: "Engineering mentor" });
  const hidden = await account("mentor", "hidden", { ...fields, is_visible: false });
  const incomingBlock = await account("mentor", "incoming block", fields);
  ok(await incomingBlock.sdk.from("blocks").insert({ blocker_id: incomingBlock.id, blocked_id: viewer.id }));
  assert.deepEqual(ok(await viewer.sdk.from("profiles").select("id").eq("id", incomingBlock.id)), [],
    "Incoming blocks must hide profiles through RLS");
  const first = await compare(viewer);
  assert.equal(first.response.status, 200, "Authenticated comparison must succeed");
  assert.equal(first.response.headers.get("cache-control"), "private, no-store");
  assert.equal(first.body.models.length, 2);
  for (const model of first.body.models) {
    assert.ok(!model.error, `${model.name} must execute successfully`);
    assert.ok(model.matches.length > 0);
    assert.ok(model.matches.every((match) => ![hidden.id, incomingBlock.id, viewer.id].includes(match.id)));
    assert.ok(model.matches.every((match) => Number.isFinite(match.similarity)));
  }
  const scratch = first.body.models.find((model) => model.dimensions === 64);
  const query = ok(await viewer.sdk.from("profiles").select(profileFields).eq("id", viewer.id).single());
  const candidates = ok(await viewer.sdk.from("profiles").select(profileFields).in("id", scratch.matches.map((match) => match.id)));
  const vectors = await generateScratchEmbeddings([comparisonText(query), ...candidates.map(comparisonText)]);
  scratch.matches.forEach((match) => {
    const index = candidates.findIndex((candidate) => candidate.id === match.id);
    const expected = cosineSimilarity(vectors.query[0], vectors.mentor[index + 1]);
    assert.ok(Math.abs(expected - match.similarity) < 1e-5, "HTTP results must use the exported checkpoint");
  });
  ok(await viewer.sdk.from("blocks").insert({ blocker_id: viewer.id, blocked_id: mentor.id }));
  const blocked = await compare(viewer);
  assert.equal(blocked.response.status, 200);
  assert.equal(blocked.body.candidateCount, first.body.candidateCount - 1, "Blocked candidate excluded from both pools");
  blocked.body.models.forEach((model) => assert.ok(model.matches.every((match) => match.id !== mentor.id)));
  ok(await viewer.sdk.from("profiles").update({ headline: "Seeking legal advice", bio: "Contract law and corporate governance",
    skills: ["Law"], industry: "Legal" }).eq("id", viewer.id));
  const changed = await compare(viewer);
  assert.equal(changed.response.status, 200);
  assert.notDeepEqual(changed.body.models[1].matches.map((match) => match.similarity),
    blocked.body.models[1].matches.map((match) => match.similarity), "Fresh profile edits must affect scratch inference");
  const limited = await compare(viewer);
  assert.equal(limited.response.status, 429);
  assert.ok(Number(limited.response.headers.get("retry-after")) > 0);
  console.log("PASS: authentication, blank profile, both live models, checkpoint parity, hidden/block filtering, fresh edits, rate limiting");
  console.log(JSON.stringify(first.body.models.map(({ name, dimensions, elapsedMs, matches }) =>
    ({ name, dimensions, elapsedMs, returned: matches.length }))));

  if (process.argv.includes("--browser")) {
    const { chromium } = await import("playwright");
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    const browserUser = await account("mentee", "browser", fields);
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await context.addCookies([...browserUser.cookies].map(([name, value]) => ({ name, value, url: appUrl.origin })));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(new URL("/discover", appUrl).href);
    await page.getByRole("heading", { name: "Your trained model · Experimental" }).waitFor({ timeout: 60_000 });
    await page.getByRole("heading", { name: "MiniLM · Pretrained" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Compare models", exact: true }).getAttribute("aria-pressed"), "true");
    assert.ok(await page.getByRole("region", { name: "Your trained model results", exact: true }).locator("ol > li").count() > 0);
    // Open one request form in each column without sending any messages.
    for (const name of ["MiniLM results", "Your trained model results"]) {
      const button = page.getByRole("region", { name, exact: true }).getByRole("button", { name: "Request mentorship", exact: true }).first();
      if (await button.count()) await button.click();
    }
    const inputIds = await page.getByRole("textbox", { name: /Introduction/ }).evaluateAll((inputs) => inputs.map((input) => input.id));
    assert.equal(new Set(inputIds).size, inputIds.length, "Parallel request forms need unique input IDs");
    const a11y = await new AxeBuilder({ page }).include('[aria-label="Live model comparison"]').analyze();
    assert.deepEqual(a11y.violations.map(({ id }) => id), []);
    await page.screenshot({ path: "/private/tmp/alumniconnect-comparison-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: "/private/tmp/alumniconnect-comparison-mobile.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log("PASS: authenticated desktop/mobile comparison, no horizontal overflow, accessibility scan, no browser errors");
  }
} finally {
  await browser?.close();
  for (const id of users.reverse()) ok(await admin.auth.admin.deleteUser(id));
  console.log("Disposable comparison accounts cleaned up");
}
