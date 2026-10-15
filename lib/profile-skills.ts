export const MAX_PROFILE_SKILLS = 20;

export function normalizeSkills(value: string): string[] {
  const seen = new Set<string>();

  return value
    .split(",")
    .map((skill) => skill.trim().replace(/\s+/gu, " "))
    .filter((skill) => {
      if (!skill) return false;
      const key = skill.normalize("NFC").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function getSkillsLimitError(count: number): string | null {
  if (count <= MAX_PROFILE_SKILLS) return null;
  const extra = count - MAX_PROFILE_SKILLS;
  return `Add up to ${MAX_PROFILE_SKILLS} unique skills. Remove ${extra} ${extra === 1 ? "skill" : "skills"} to save your profile.`;
}
