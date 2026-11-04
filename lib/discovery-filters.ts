export interface DiscoveryFilterOptions {
  industry?: string;
  skills?: string[];
  matchMode?: "any" | "all";
}

export interface FilterableMentor {
  id: string;
  full_name: string;
  headline?: string;
  bio?: string;
  industry?: string;
  skills?: string[];
  graduation_year?: number | null;
  similarity?: number;
  shared_skills?: string[];
}

export type MentorRequestState = "pending" | "accepted" | "declined" | "cancelled";

/**
 * Extracts unique, sorted industries and skills from an array of mentors.
 */
export function extractAvailableFilters(mentors: FilterableMentor[] = []): {
  industries: string[];
  skills: string[];
} {
  const industrySet = new Set<string>();
  const skillSet = new Set<string>();

  for (const mentor of mentors) {
    if (mentor.industry && typeof mentor.industry === "string") {
      const trimmed = mentor.industry.trim();
      if (trimmed.length > 0) {
        industrySet.add(trimmed);
      }
    }

    if (Array.isArray(mentor.skills)) {
      for (const skill of mentor.skills) {
        if (typeof skill === "string") {
          const trimmed = skill.trim();
          if (trimmed.length > 0) {
            skillSet.add(trimmed);
          }
        }
      }
    }
  }

  return {
    industries: Array.from(industrySet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    skills: Array.from(skillSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  };
}

/**
 * Filters a list of mentors by industry and selected skills.
 */
export function filterMentors<T extends FilterableMentor>(
  mentors: T[] = [],
  filter: DiscoveryFilterOptions = {},
): T[] {
  const selectedIndustry = filter.industry?.trim().toLowerCase();
  const selectedSkills = (filter.skills ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const matchMode = filter.matchMode ?? "any";

  if (!selectedIndustry && selectedSkills.length === 0) {
    return mentors;
  }

  return mentors.filter((mentor) => {
    // 1. Industry filter
    if (selectedIndustry && selectedIndustry !== "all") {
      const mentorIndustry = (mentor.industry ?? "").trim().toLowerCase();
      if (mentorIndustry !== selectedIndustry) {
        return false;
      }
    }

    // 2. Skills filter
    if (selectedSkills.length > 0) {
      const mentorSkills = (mentor.skills ?? []).map((s) => s.trim().toLowerCase());
      if (matchMode === "all") {
        const hasAll = selectedSkills.every((s) => mentorSkills.includes(s));
        if (!hasAll) return false;
      } else {
        const hasAny = selectedSkills.some((s) => mentorSkills.includes(s));
        if (!hasAny) return false;
      }
    }

    return true;
  });
}

/**
 * Computes the active persistent relationship status for a mentor.
 */
export function getActiveRelationshipStatus(
  mentorId: string,
  requestMap: Record<string, MentorRequestState> = {},
): "pending" | "connected" | null {
  const status = requestMap[mentorId];
  if (status === "pending") return "pending";
  if (status === "accepted") return "connected";
  return null;
}
