export interface DiscoveryFilterOptions {
  industry?: string;
  graduationYear?: string | number;
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
 * Extracts unique, sorted industries, skills, and graduation cohort years from an array of mentors.
 */
export function extractAvailableFilters(mentors: FilterableMentor[] = []): {
  industries: string[];
  skills: string[];
  graduationYears: number[];
} {
  const industrySet = new Set<string>();
  const skillSet = new Set<string>();
  const yearSet = new Set<number>();

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

    if (
      typeof mentor.graduation_year === "number" &&
      Number.isInteger(mentor.graduation_year) &&
      mentor.graduation_year >= 1950
    ) {
      yearSet.add(mentor.graduation_year);
    }
  }

  return {
    industries: Array.from(industrySet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    skills: Array.from(skillSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    graduationYears: Array.from(yearSet).sort((a, b) => b - a),
  };
}

/**
 * Filters a list of mentors by industry, graduation cohort year, and selected skills.
 */
export function filterMentors<T extends FilterableMentor>(
  mentors: T[] = [],
  filter: DiscoveryFilterOptions = {},
): T[] {
  const selectedIndustry = filter.industry?.trim().toLowerCase();
  const rawYear = filter.graduationYear !== undefined && filter.graduationYear !== null
    ? String(filter.graduationYear).trim().toLowerCase()
    : "";
  const selectedYear = rawYear && rawYear !== "all" ? Number(rawYear) : null;
  const selectedSkills = (filter.skills ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const matchMode = filter.matchMode ?? "any";

  if ((!selectedIndustry || selectedIndustry === "all") && selectedYear === null && selectedSkills.length === 0) {
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

    // 2. Cohort (graduation_year) filter (#7, #16)
    if (selectedYear !== null) {
      if (mentor.graduation_year !== selectedYear) {
        return false;
      }
    }

    // 3. Skills filter
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

const REQUEST_STATE_PRIORITY: Record<MentorRequestState, number> = {
  accepted: 4,
  pending: 3,
  declined: 2,
  cancelled: 1,
};

/**
 * Builds a prioritized map of mentor relationship states so historical
 * cancelled/declined requests cannot overwrite active pending or accepted connections.
 */
export function buildRequestStateMap(
  requests: Array<{ mentor_id?: string | null; status?: string | null }> = [],
  connectedMentorIds: string[] = [],
): Record<string, MentorRequestState> {
  const map: Record<string, MentorRequestState> = {};

  for (const req of requests) {
    const mentorId = req.mentor_id?.trim();
    const status = req.status as MentorRequestState | undefined;
    if (!mentorId || !status || !(status in REQUEST_STATE_PRIORITY)) continue;
    const existing = map[mentorId];
    if (!existing || REQUEST_STATE_PRIORITY[status] > REQUEST_STATE_PRIORITY[existing]) {
      map[mentorId] = status;
    }
  }

  for (const mentorId of connectedMentorIds) {
    const trimmed = mentorId?.trim();
    if (trimmed) {
      map[trimmed] = "accepted";
    }
  }

  return map;
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
