// Presentation only: these helpers never filter, sort or score recommendations.
export function sharedSkillLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((skill) => {
    if (typeof skill !== "string") return [];
    const label = skill.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return [];
    seen.add(key);
    return [label];
  });
}

export function mentorExplanation(mode: "semantic" | "keyword", sharedSkills: unknown) {
  if (mode === "keyword") {
    return {
      summary: "Found through your keyword search. Review this mentor’s profile to assess their experience.",
      limitation: null,
    };
  }
  const labels = sharedSkillLabels(sharedSkills);
  return {
    summary: labels.length ? `Shared skills: ${labels.join(", ")}`
      : "No exact shared skills identified. Review this mentor’s profile for relevant experience.",
    limitation: "Recommendations use profile text similarity. Similarity does not guarantee mentorship suitability or success.",
  };
}

export function formatProfileSimilarity(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) && value >= -1 && value <= 1
    ? value.toFixed(3) : "Unavailable";
}
