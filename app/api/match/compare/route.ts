import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, MODEL_ID } from "@/lib/embedding/embed";
import { EmbedGuard } from "@/lib/embedding/embed-guard";
import { generateScratchEmbeddings, SCRATCH_MODEL_ID } from "@/lib/scratch-model";
import { comparisonText, rankComparison, type ComparisonModelResult, type ComparisonProfile } from "@/lib/model-comparison";

export const runtime = "nodejs";
export const maxDuration = 60;
const guard = new EmbedGuard({ maxRequests: 3 });
let running = 0;
const fields = "id, full_name, headline, bio, skills, industry, graduation_year, accepting_requests";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const json = (body: unknown, status = 200, headers = {}) =>
    NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
  if (!user) return json({ error: "Not authenticated" }, 401);
  guard.prune();
  const limit = guard.checkRateLimit(user.id);
  if (!limit.allowed) return json({ error: "Please wait a moment before comparing again." }, 429,
    { "Retry-After": String(limit.retryAfterSeconds) });
  if (running >= 2) return json({ error: "Model comparison is busy. Please retry shortly." }, 503);

  // Request-scoped authenticated client: profile privacy and block RLS still apply.
  const [own, candidates] = await Promise.all([
    supabase.from("profiles").select(fields).eq("id", user.id).single(),
    supabase.from("profiles").select(fields).eq("role", "mentor").eq("is_visible", true)
      .neq("id", user.id).order("id").limit(51),
  ]);
  if (own.error || candidates.error || !own.data) {
    return json({ error: "Could not load profiles for comparison. Please retry." }, 503);
  }
  const profile = own.data as ComparisonProfile;
  if (!comparisonText(profile).trim()) {
    return json({ error: "Add a headline, bio, or skills to your profile before comparing models." }, 422);
  }
  const mentors = (candidates.data ?? []).slice(0, 50) as ComparisonProfile[];
  // A bounded, ID-ordered pool avoids selecting candidates with either model.
  // All inference uses this fresh snapshot; no vectors are written back to profiles.
  const texts = [profile, ...mentors].map(comparisonText);
  if (running >= 2) return json({ error: "Model comparison is busy. Please retry shortly." }, 503);
  running++;
  const job = (async () => {
    const measure = async (id: string, name: string, dimensions: number,
      infer: () => Promise<{ query: number[]; mentors: number[][] }>): Promise<ComparisonModelResult> => {
      const started = performance.now();
      try {
        if (!mentors.length) return { id, name, dimensions, elapsedMs: 0, matches: [] };
        const vectors = await infer();
        return { id, name, dimensions, elapsedMs: Math.round(performance.now() - started),
          matches: rankComparison(profile, mentors, vectors.query, vectors.mentors) };
      } catch {
        return { id, name, dimensions, elapsedMs: Math.round(performance.now() - started), matches: [],
          error: `${name} is unavailable. Please retry the comparison.` };
      }
    };
    const models = await Promise.all([
      measure(MODEL_ID, "MiniLM", 384, async () => {
        // Sequential inference bounds native runtime memory; identical fields and pool.
        const vectors = [];
        for (const text of texts) vectors.push(await generateEmbedding(text));
        return { query: vectors[0], mentors: vectors.slice(1) };
      }),
      measure(SCRATCH_MODEL_ID, "Your trained model", 64, async () => {
        const vectors = await generateScratchEmbeddings(texts);
        return { query: vectors.query[0], mentors: vectors.mentor.slice(1) };
      }),
    ]);
    return { candidateCount: mentors.length, truncated: (candidates.data?.length ?? 0) > 50, models };
  })().finally(() => { running--; });
  // Native work retains its concurrency slot even if the HTTP deadline expires.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([job, new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 55_000);
    })]);
    return result ? json(result) : json({ error: "The models took too long to respond. Please retry shortly." }, 504);
  } finally {
    clearTimeout(timer);
  }
}
