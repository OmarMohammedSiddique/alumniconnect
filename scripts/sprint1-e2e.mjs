// Sprint 1 end-to-end proof: auth trigger -> profile -> server-side embedding
// -> service-role write -> match_mentors RPC as an authenticated user.
import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@huggingface/transformers";

const URL = "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
const embed = async (t) =>
  Array.from((await extractor(t, { pooling: "mean", normalize: true })).data);

async function makeUser(email, role, fields) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "test-password-123",
    email_confirm: true,
    user_metadata: { role, full_name: fields.full_name },
  });
  if (error) throw error;
  const { error: e2 } = await admin.from("profiles").update(fields).eq("id", data.user.id);
  if (e2) throw e2;
  return data.user;
}

const mentor1 = await makeUser("ml.mentor@e2e.local", "mentor", {
  full_name: "Grace Wanjiku",
  headline: "Senior ML engineer at a fintech",
  bio: "I build recommendation systems and data platforms.",
  skills: ["Python", "Machine Learning", "Spark"],
  industry: "Technology",
});
const mentor2 = await makeUser("law.mentor@e2e.local", "mentor", {
  full_name: "Brian Otieno",
  headline: "Corporate lawyer, M&A",
  bio: "I advise on mergers, acquisitions and corporate governance.",
  skills: ["Contract Law", "Negotiation"],
  industry: "Legal",
});
const mentee = await makeUser("ds.mentee@e2e.local", "mentee", {
  full_name: "Amina Hassan",
  headline: "Recent graduate exploring data engineering",
  bio: "Interested in machine learning pipelines and cloud data infrastructure.",
  skills: ["Python", "SQL"],
  industry: "Technology",
});

// Server-side embedding write (what /api/embed does), via service role.
for (const u of [mentor1, mentor2, mentee]) {
  const { data: p } = await admin
    .from("profiles")
    .select("headline, bio, skills, industry")
    .eq("id", u.id)
    .single();
  const vec = await embed(`${p.headline}\n${p.bio}\nSkills: ${p.skills.join(", ")}\nIndustry: ${p.industry}`);
  const { error } = await admin
    .from("profiles")
    .update({ embedding: JSON.stringify(vec) })
    .eq("id", u.id);
  if (error) throw error;
}

// Sign in as the mentee (RLS applies) and run the matching RPC.
const client = createClient(URL, ANON, { auth: { persistSession: false } });
const { error: signInErr } = await client.auth.signInWithPassword({
  email: "ds.mentee@e2e.local",
  password: "test-password-123",
});
if (signInErr) throw signInErr;

const { data: me } = await client
  .from("profiles")
  .select("embedding")
  .eq("id", mentee.id)
  .single();
const { data: matches, error: matchErr } = await client.rpc("match_mentors", {
  query_embedding: me.embedding,
  match_count: 5,
});
if (matchErr) throw matchErr;

console.table(matches.map((m) => ({ name: m.full_name, industry: m.industry, similarity: m.similarity.toFixed(4) })));
if (matches[0]?.full_name !== "Grace Wanjiku") throw new Error("FAIL: ML mentor should rank first");
if (matches[0].similarity <= matches[1].similarity) throw new Error("FAIL: ranking not descending");
console.log("SPRINT 1 E2E PASSED");

// Clean up test users so dev data stays tidy.
for (const u of [mentor1, mentor2, mentee]) await admin.auth.admin.deleteUser(u.id);
