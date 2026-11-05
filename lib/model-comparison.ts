export interface ComparisonProfile {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  skills: string[];
  industry: string;
  graduation_year: number | null;
  accepting_requests?: boolean;
}

/** Exactly the four fields used by the pilot's Python input builder. */
export function comparisonText(profile: ComparisonProfile): string {
  return [profile.headline, profile.bio,
    profile.skills.length ? `Skills: ${profile.skills.join(", ")}` : "",
    profile.industry ? `Industry: ${profile.industry}` : ""].filter(Boolean).join("\n");
}

export function cosineSimilarity(query: number[], candidate: number[]): number {
  if (!query.length || query.length !== candidate.length ||
      !query.every(Number.isFinite) || !candidate.every(Number.isFinite)) {
    throw new Error("Incompatible or invalid model vectors");
  }
  let dot = 0, a = 0, b = 0;
  for (let i = 0; i < query.length; i++) {
    dot += query[i] * candidate[i];
    a += query[i] ** 2;
    b += candidate[i] ** 2;
  }
  if (!a || !b) throw new Error("Empty model vector");
  return Math.max(-1, Math.min(1, dot / Math.sqrt(a * b)));
}

export function rankComparison(
  query: ComparisonProfile, mentors: ComparisonProfile[], queryVector: number[], mentorVectors: number[][],
) {
  if (mentorVectors.length !== mentors.length) throw new Error("Incomplete model output");
  const skills = new Set(query.skills.map((skill) => skill.toLowerCase()));
  return mentors.map((mentor, index) => ({
    ...mentor,
    shared_skills: mentor.skills.filter((skill) => skills.has(skill.toLowerCase())),
    similarity: cosineSimilarity(queryVector, mentorVectors[index]),
  })).sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id)).slice(0, 5);
}

export interface ComparisonModelResult {
  id: string;
  name: string;
  dimensions: number;
  elapsedMs: number;
  matches: ReturnType<typeof rankComparison>;
  error?: string;
}

export interface ModelComparisonResponse {
  candidateCount: number;
  truncated: boolean;
  models: ComparisonModelResult[];
}
