"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatFullName } from "@/lib/profile-name";
import { getSkillsLimitError, normalizeSkills } from "@/lib/profile-skills";
import { MAX_BIO_LENGTH, MAX_HEADLINE_LENGTH } from "@/lib/form-limits";

export type ProfileState =
  | { error: string | null; saved: false }
  | { error: null; saved: true; fullName: string };

const CURRENT_YEAR = new Date().getFullYear();

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", saved: false };

  const fullName = formatFullName(String(formData.get("full_name") ?? ""));
  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const yearRaw = String(formData.get("graduation_year") ?? "").trim();
  const skills = normalizeSkills(String(formData.get("skills") ?? ""));
  const skillsError = getSkillsLimitError(skills.length);

  if (!fullName) return { error: "Full name is required.", saved: false };
  if (skillsError) return { error: skillsError, saved: false };
  if (headline.length > MAX_HEADLINE_LENGTH)
    return { error: `Headline must be ${MAX_HEADLINE_LENGTH} characters or fewer.`, saved: false };
  if (bio.length > MAX_BIO_LENGTH)
    return { error: `Bio must be ${MAX_BIO_LENGTH} characters or fewer.`, saved: false };

  let graduationYear: number | null = null;
  if (yearRaw) {
    graduationYear = Number(yearRaw);
    if (
      !Number.isInteger(graduationYear) ||
      graduationYear < 1950 ||
      graduationYear > CURRENT_YEAR
    ) {
      return { error: "Enter a valid graduation year.", saved: false };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      headline,
      bio,
      industry,
      skills,
      graduation_year: graduationYear,
    })
    .eq("id", user.id);

  if (error) return { error: error.message, saved: false };

  revalidatePath("/profile");
  return { error: null, saved: true, fullName };
}
