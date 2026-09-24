"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error: string | null;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "mentee");

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  // Staff roles cannot be chosen at sign-up; the DB trigger also clamps this.
  if (role !== "mentee" && role !== "mentor") {
    return { error: "Invalid role." };
  }

  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) return { error: error.message };
  } catch {
    return {
      error: "Could not reach the authentication service. Please try again.",
    };
  }

  redirect("/profile");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/discover";

  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Invalid email or password." };
  } catch {
    return {
      error: "Could not reach the authentication service. Please try again.",
    };
  }

  // Only allow internal redirect targets.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/discover");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
