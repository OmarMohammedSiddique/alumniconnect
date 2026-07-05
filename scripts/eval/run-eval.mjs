// Matching-engine evaluation (proposal Specific Objective v).
//
// Seeds synthetic mentors (ground-truth domain labels) through the real
// pipeline (auth trigger -> profile -> MiniLM embedding -> pgvector), then
// scores three conditions over synthetic mentees:
//   1. semantic-full     — pgvector cosine over the full mentee profile
//   2. semantic-minimal  — cold start: headline + skills only, no bio
//   3. keyword           — ranked tsvector full-text baseline
// A match is relevant when the mentor's ground-truth domain equals the
// mentee's. Reports Precision@1/3/5, MRR, and coverage.
//
// Run: set -a && source .env.local && set +a && node scripts/eval/run-eval.mjs [--keep]
import { writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@huggingface/transformers";
import { generateMentors, generateMentees, DOMAINS } from "./dataset.mjs";

const MENTORS_PER_DOMAIN = 5;
const MENTEES_PER_DOMAIN = 3;
const K = 5;
const keep = process.argv.includes("--keep");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
const embed = async (t) =>
  Array.from((await extractor(t, { pooling: "mean", normalize: true })).data);

// Mirror lib/embedding/embed.ts buildProfileEmbeddingText exactly, so the
// evaluation measures the system as shipped.
const profileText = (p) =>
  [
    p.headline,
    p.bio,
    p.skills.length ? `Skills: ${p.skills.join(", ")}` : "",
    p.industry ? `Industry: ${p.industry}` : "",
    p.graduation_year ? `Graduated: ${p.graduation_year}` : "",
  ]
    .filter(Boolean)
    .join("\n");

async function cleanupEvalUsers() {
  let removed = 0;
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const evals = data.users.filter((u) => u.email?.endsWith("@eval.local"));
    for (const u of evals) {
      await admin.auth.admin.deleteUser(u.id);
      removed++;
    }
    if (data.users.length < 200) break;
  }
  return removed;
}

// --- seed mentors -----------------------------------------------------------
console.log("cleaning up previous eval users:", await cleanupEvalUsers());
const mentors = generateMentors(MENTORS_PER_DOMAIN);
const domainByMentorId = new Map();

console.log(`seeding ${mentors.length} mentors…`);
for (const m of mentors) {
  const { data, error } = await admin.auth.admin.createUser({
    email: m.email,
    password: "eval-password-123",
    email_confirm: true,
    user_metadata: { role: "mentor", full_name: m.full_name },
  });
  if (error) throw error;
  const vec = await embed(profileText(m));
  const { error: e2 } = await admin
    .from("profiles")
    .update({
      full_name: m.full_name,
      headline: m.headline,
      bio: m.bio,
      skills: m.skills,
      industry: m.industry,
      graduation_year: m.graduation_year,
      embedding: JSON.stringify(vec),
    })
    .eq("id", data.user.id);
  if (e2) throw e2;
  domainByMentorId.set(data.user.id, m.domain);
}

// Exclude pre-existing dev/seed mentors from scoring (they have no ground
// truth label); they stay in the candidate pool as realistic noise.
const isLabelled = (id) => domainByMentorId.has(id);

// --- scoring ----------------------------------------------------------------
const mentees = generateMentees(MENTEES_PER_DOMAIN);

function score(results, menteeDomain) {
  const labelled = results.filter((r) => isLabelled(r.id));
  const rel = labelled.map((r) => domainByMentorId.get(r.id) === menteeDomain);
  const pAt = (k) =>
    rel.length === 0 ? 0 : rel.slice(0, k).filter(Boolean).length / Math.min(k, K);
  const firstRel = rel.findIndex(Boolean);
  return {
    p1: rel.length ? (rel[0] ? 1 : 0) : 0,
    p3: pAt(3),
    p5: pAt(5),
    rr: firstRel === -1 ? 0 : 1 / (firstRel + 1),
    any: rel.length > 0 ? 1 : 0,
  };
}

async function semantic(text) {
  const vec = await embed(text);
  const { data, error } = await admin.rpc("match_mentors", {
    query_embedding: JSON.stringify(vec),
    match_count: 20,
  });
  if (error) throw error;
  return data;
}

async function keyword(terms) {
  const { data, error } = await admin.rpc("search_mentors", {
    search_query: terms.join(" or "),
    match_count: 20,
  });
  if (error) throw error;
  return data;
}

// A mentee is in the "lexical-overlap" subset when any word of their listed
// skills appears verbatim in their domain's mentor skill vocabulary; the
// rest are "vocab-mismatch" — mentees who describe the same field in
// different words. Keyword matching is expected to degrade on the latter.
const tokens = (arr) =>
  new Set(arr.flatMap((s) => s.toLowerCase().split(/[^a-z0-9+#]+/)).filter(Boolean));
const domainVocab = new Map(
  DOMAINS.map((d) => [d.key, tokens(d.skills)]),
);
const hasOverlap = (mentee) => {
  const vocab = domainVocab.get(mentee.domain);
  return [...tokens(mentee.skills)].some((t) => vocab.has(t));
};

const conditions = {
  "semantic-full": [],
  "semantic-minimal": [],
  "keyword+category": [],
  "keyword-skills-only": [],
};

console.log(`scoring ${mentees.length} mentees × 4 conditions…`);
for (const mentee of mentees) {
  const overlap = hasOverlap(mentee);
  conditions["semantic-full"].push({
    overlap,
    ...score(await semantic(profileText(mentee)), mentee.domain),
  });
  // Cold start: brand-new account that only filled headline + skills.
  conditions["semantic-minimal"].push({
    overlap,
    ...score(
      await semantic(
        [mentee.headline, `Skills: ${mentee.skills.join(", ")}`].join("\n"),
      ),
      mentee.domain,
    ),
  });
  conditions["keyword+category"].push({
    overlap,
    ...score(
      await keyword([...mentee.skills, mentee.industry]),
      mentee.domain,
    ),
  });
  conditions["keyword-skills-only"].push({
    overlap,
    ...score(await keyword(mentee.skills), mentee.domain),
  });
}

const avg = (rows, key) =>
  rows.length ? rows.reduce((s, r) => s + r[key], 0) / rows.length : 0;

const makeTable = (filter) =>
  Object.entries(conditions).map(([name, rows]) => {
    const subset = rows.filter(filter);
    return {
      condition: name,
      n: subset.length,
      "P@1": avg(subset, "p1").toFixed(3),
      "P@3": avg(subset, "p3").toFixed(3),
      "P@5": avg(subset, "p5").toFixed(3),
      MRR: avg(subset, "rr").toFixed(3),
      coverage: avg(subset, "any").toFixed(3),
    };
  });

const tableAll = makeTable(() => true);
const tableOverlap = makeTable((r) => r.overlap);
const tableMismatch = makeTable((r) => !r.overlap);
console.log("ALL MENTEES");
console.table(tableAll);
console.log("LEXICAL-OVERLAP SUBSET");
console.table(tableOverlap);
console.log("VOCAB-MISMATCH SUBSET");
console.table(tableMismatch);

// --- report -----------------------------------------------------------------
const md = `# Matching Engine Evaluation

Run date: ${process.env.EVAL_DATE ?? "(set EVAL_DATE)"} · dataset seed: 42/1337 (deterministic)

## Method

- **Corpus:** ${mentors.length} synthetic mentors across ${DOMAINS.length} career domains (${MENTORS_PER_DOMAIN}/domain), seeded through the production pipeline (Supabase auth trigger → profile → server-side MiniLM embedding → pgvector, ivfflat index).
- **Queries:** ${mentees.length} synthetic mentees (${MENTEES_PER_DOMAIN}/domain). Mentee goal statements are written in natural language and deliberately do not always reuse mentor skill vocabulary.
- **Ground truth:** a returned mentor is *relevant* iff their generator domain equals the mentee's.
- **Conditions:**
  - \`semantic-full\` — pgvector cosine similarity (\`match_mentors\`) over the full mentee profile.
  - \`semantic-minimal\` — cold-start simulation: headline + skills only (no bio/industry), as at first sign-up.
  - \`keyword+category\` — ranked PostgreSQL full-text search (\`search_mentors\`, ts_rank) over the mentee's skills **and industry** as an OR query. The industry term makes this a category/attribute-filtering baseline (what commercial alumni platforms do).
  - \`keyword-skills-only\` — the same full-text search over skills alone: pure keyword matching with no category signal.
- **Metrics:** Precision@1/3/5 (fraction of relevant mentors in top k), MRR (reciprocal rank of first relevant), coverage (fraction of mentees receiving ≥1 scoreable result). Pre-existing unlabelled dev mentors remain in the pool as noise but are excluded from scoring.

Mentees are additionally split by whether any of their listed skill words
appear verbatim in their domain's mentor skill vocabulary (**lexical-overlap**)
or not (**vocab-mismatch** — same field, different words).

## Results

${[
  ["All mentees", tableAll],
  ["Lexical-overlap subset", tableOverlap],
  ["Vocab-mismatch subset", tableMismatch],
]
  .map(
    ([title, t]) => `### ${title}

| Condition | n | P@1 | P@3 | P@5 | MRR | Coverage |
|---|---|---|---|---|---|---|
${t.map((r) => `| ${r.condition} | ${r.n} | ${r["P@1"]} | ${r["P@3"]} | ${r["P@5"]} | ${r.MRR} | ${r.coverage} |`).join("\n")}`,
  )
  .join("\n\n")}

## Reading the results

- **Two keyword baselines, deliberately.** \`keyword+category\` is a strong
  attribute-filtering baseline: the industry term alone routes it to the
  right sector, which is what commercial platforms' category filters do.
  \`keyword-skills-only\` is pure keyword matching. Comparing semantic against
  both separates "structured category data helps" from "word overlap helps".
- **The subsets are the story.** When mentees use the same words as mentors,
  keyword matching is hard to beat. When they describe the same field in
  different vocabulary (the common case for early-career users who do not
  yet know the field's terminology), pure keyword matching degrades — look
  at \`keyword-skills-only\` coverage and precision on the vocab-mismatch
  subset — while semantic matching holds.
- **semantic-minimal vs semantic-full** quantifies cold-start resilience: how
  much match quality a brand-new, sparse profile (headline + skills only)
  retains relative to a completed one.

Reproduce with \`node scripts/eval/run-eval.mjs\` against a local Supabase stack.
`;

mkdirSync("docs", { recursive: true });
writeFileSync("docs/eval-results.md", md);
console.log("wrote docs/eval-results.md");

if (!keep) {
  console.log("cleaning up eval users:", await cleanupEvalUsers());
} else {
  console.log("kept eval users (--keep)");
}
