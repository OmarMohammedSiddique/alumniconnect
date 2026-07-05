"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileState {
  error: string | null;
  saved: boolean;
}

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

  const fullName = String(formData.get("full_name") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const yearRaw = String(formData.get("graduation_year") ?? "").trim();
  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!fullName) return { error: "Full name is required.", saved: false };
  if (headline.length > 120)
    return { error: "Headline must be 120 characters or fewer.", saved: false };
  if (bio.length > 2000)
    return { error: "Bio must be 2000 characters or fewer.", saved: false };

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
  return { error: null, saved: true };
}
