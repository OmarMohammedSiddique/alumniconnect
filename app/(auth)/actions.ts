"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFullName } from "@/lib/profile-name";
import { getPasswordError } from "@/lib/signup-validation";
import { saveProfilePhoto, validateProfilePhoto } from "@/lib/profile-photo";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";

export interface AuthState {
  error: string | null;
  confirmationRequired?: boolean;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = formatFullName(String(formData.get("first_name") ?? ""));
  const lastName = formatFullName(String(formData.get("last_name") ?? ""));
  const fullName = `${firstName} ${lastName}`;
  const confirmation = String(formData.get("confirm_password") ?? "");
  const photo = formData.get("profile_photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  const role = String(formData.get("role") ?? "mentee");

  if (!email || !password || !firstName || !lastName) {
    return { error: "All fields are required." };
  }
  if (firstName.length > 100 || lastName.length > 100) return { error: "Each name must be 100 characters or fewer." };
  const passwordError = getPasswordError(password, confirmation);
  if (passwordError) return { error: passwordError };
  if (hasPhoto) {
    const photoError = await validateProfilePhoto(photo);
    if (photoError) return { error: photoError };
  }
  // Staff roles cannot be chosen at sign-up; the DB trigger also clamps this.
  if (role !== "mentee" && role !== "mentor") {
    return { error: "Invalid role." };
  }

  const supabase = await createClient();
  let photoFailed = false;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, first_name: firstName, last_name: lastName, role } },
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: null, confirmationRequired: true };
    if (hasPhoto) {
      try { photoFailed = Boolean(await saveProfilePhoto(photo)); }
      catch { photoFailed = true; }
    }
  } catch {
    return {
      error: "Could not reach the authentication service. Please try again.",
    };
  }

  redirect(photoFailed ? "/profile/photo?retry=1" : "/profile");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeSignInRedirect(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Invalid email or password." };
  } catch {
    return {
      error: "Could not reach the authentication service. Please try again.",
    };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
