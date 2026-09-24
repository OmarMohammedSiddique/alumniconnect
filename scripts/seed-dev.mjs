// Seeds a handful of mentor profiles (with embeddings) for local development.
// Run: set -a && source .env.local && set +a && node scripts/seed-dev.mjs
import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@huggingface/transformers";

const admin = createClient(
  "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });

const MENTORS = [
  {
    email: "grace.mentor@seed.local",
    full_name: "Grace Wanjiku",
    headline: "Senior ML engineer at a fintech",
    bio: "I build recommendation systems and data platforms, and enjoy helping early-career engineers find their footing.",
    skills: ["Python", "Machine Learning", "Spark", "SQL"],
    industry: "Technology",
    graduation_year: 2015,
  },
  {
    email: "brian.mentor@seed.local",
    full_name: "Brian Otieno",
    headline: "Corporate lawyer, M&A",
    bio: "I advise on mergers, acquisitions and corporate governance across East Africa.",
    skills: ["Contract Law", "Negotiation", "Corporate Governance"],
    industry: "Legal",
    graduation_year: 2012,
  },
  {
    email: "fatima.mentor@seed.local",
    full_name: "Fatima Noor",
    headline: "Product manager for developer tools",
    bio: "Former software engineer turned PM. I mentor on career transitions, product thinking, and stakeholder management.",
    skills: ["Product Management", "Public Speaking", "SQL"],
    industry: "Technology",
    graduation_year: 2016,
  },
  {
    email: "david.mentor@seed.local",
    full_name: "David Kimani",
    headline: "Cloud infrastructure architect",
    bio: "I design cloud data infrastructure and platform engineering teams. Happy to guide anyone heading into DevOps or data engineering.",
    skills: ["AWS", "Kubernetes", "Terraform", "Python"],
    industry: "Technology",
    graduation_year: 2013,
  },
  {
    email: "esther.mentor@seed.local",
    full_name: "Esther Mwangi",
    headline: "Finance director, aviation",
    bio: "Two decades in corporate finance and audit. I mentor on leadership, finance careers, and professional certifications.",
    skills: ["Financial Analysis", "Audit", "Leadership"],
    industry: "Finance",
    graduation_year: 2004,
  },
];

for (const m of MENTORS) {
  const { data: existing } = await admin.auth.admin.listUsers();
  if (existing.users.some((u) => u.email === m.email)) {
    console.log("skip (exists):", m.email);
    continue;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: m.email,
    password: "seed-password-123",
    email_confirm: true,
    user_metadata: { role: "mentor", full_name: m.full_name },
  });
  if (error) throw error;
  const text = `${m.headline}\n${m.bio}\nSkills: ${m.skills.join(", ")}\nIndustry: ${m.industry}\nGraduated: ${m.graduation_year}`;
  const vec = Array.from(
    (await extractor(text, { pooling: "mean", normalize: true })).data,
  );
  const fields = Object.fromEntries(
    Object.entries(m).filter(([key]) => key !== "email"),
  );
  const { error: e2 } = await admin
    .from("profiles")
    .update({ ...fields, embedding: JSON.stringify(vec) })
    .eq("id", data.user.id);
  if (e2) throw e2;
  console.log("seeded:", m.full_name);
}
console.log("DONE");
