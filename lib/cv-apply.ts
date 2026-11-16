// Decides how CV suggestions meet what the member has already typed (#108):
// empty fields are filled, filled fields only get an offer the member can accept.
import type { CvSuggestions } from "./cv-extract.ts";
import { MAX_PROFILE_SKILLS, normalizeSkills } from "./profile-skills.ts";

export type CvField = "headline" | "bio" | "skills" | "industry" | "graduation_year";
export type ProfileDraftFields = Record<CvField, string>;

export const CV_FIELD_LABELS: Record<CvField, string> = {
  headline: "Headline",
  bio: "Bio",
  skills: "Skills",
  industry: "Industry",
  graduation_year: "Graduation year",
};

export interface CvOffer {
  field: CvField;
  label: string;
  /** The value the field would hold if the member accepts. */
  value: string;
  description: string;
}

export interface CvApplyPlan {
  fill: Partial<ProfileDraftFields>;
  filledLabels: string[];
  offers: CvOffer[];
  missingLabels: string[];
}

function suggestedText(field: CvField, s: CvSuggestions): string {
  if (field === "skills") return s.skills.join(", ");
  if (field === "graduation_year") return s.graduation_year ? String(s.graduation_year) : "";
  return s[field] ?? "";
}

export function planCvApply(draft: ProfileDraftFields, suggestions: CvSuggestions): CvApplyPlan {
  const plan: CvApplyPlan = { fill: {}, filledLabels: [], offers: [], missingLabels: [] };
  for (const field of Object.keys(CV_FIELD_LABELS) as CvField[]) {
    const label = CV_FIELD_LABELS[field];
    const value = suggestedText(field, suggestions).trim();
    const current = draft[field].trim();
    if (!value) {
      plan.missingLabels.push(label);
      continue;
    }
    if (!current) {
      plan.fill[field] = value;
      plan.filledLabels.push(label);
      continue;
    }
    if (field === "skills") {
      const existing = normalizeSkills(current);
      const known = new Set(existing.map((skill) => skill.toLowerCase()));
      const extra = suggestions.skills.filter((skill) => !known.has(skill.toLowerCase()));
      const room = Math.max(0, MAX_PROFILE_SKILLS - existing.length);
      const added = extra.slice(0, room);
      if (added.length) {
        plan.offers.push({
          field, label, value: [...existing, ...added].join(", "),
          description: `Add ${added.join(", ")}`,
        });
      }
      continue;
    }
    if (value.toLowerCase() !== current.toLowerCase()) {
      plan.offers.push({ field, label, value, description: value });
    }
  }
  return plan;
}
