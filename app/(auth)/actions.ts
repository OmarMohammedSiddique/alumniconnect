"use server";

import { cookies, headers } from "next/headers";
import { beginGoogleSignIn, checkGoogleProvider, getGoogleAuthMessage, getGoogleAuthOrigin, GOOGLE_NEXT_COOKIE } from "@/lib/google-auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthWithDeadline } from "@/lib/supabase/auth-fetch";
import { ACCOUNT_EMAIL_FLOW, ACCOUNT_EMAIL_SECONDS } from "@/lib/account-email";
import { normalizeOtpEmail } from "@/lib/email-otp";
import { formatFullName } from "@/lib/profile-name";
import { getIdentityCollectionError } from "@/lib/registration-privacy";
import { getPasswordError } from "@/lib/signup-validation";
import { saveProfilePhoto, validateProfilePhoto } from "@/lib/profile-photo";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";
import { CAPTCHA_FAILED_MESSAGE, captchaOption, isCaptchaError, readCaptchaToken } from "@/lib/turnstile";

export interface AuthState {
  error: string | null;
  confirmationRequired?: boolean;
  confirmationEmail?: string;
  confirmationCodeEnabled?: boolean;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const identityError = getIdentityCollectionError(formData);
  if (identityError) return { error: identityError };

  const email = normalizeOtpEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  let firstName = formatFullName(String(formData.get("first_name") ?? ""));
  let lastName = formatFullName(String(formData.get("last_name") ?? ""));
  const fullNameField = formatFullName(String(formData.get("full_name") ?? ""));
  if ((!firstName || !lastName) && fullNameField) {
    const parts = fullNameField.split(/\s+/);
    firstName = firstName || parts[0] || "";
    lastName = lastName || parts.slice(1).join(" ") || parts[0] || "";
  }
  const fullName = `${firstName} ${lastName}`.trim();
  const confirmation = String(formData.get("confirm_password") ?? "");
  const photo = formData.get("profile_photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  const role = String(formData.get("role") ?? "mentee");

  if (!email || !password || !firstName || !lastName) {
    return { error: "All fields are required." };
  }
  // Staff roles cannot be chosen at sign-up; the DB trigger also clamps this.
  if (role !== "mentee" && role !== "mentor") {
    return { error: "Invalid role." };
  }
  if (firstName.length > 100 || lastName.length > 100) return { error: "Each name must be 100 characters or fewer." };
  const passwordError = getPasswordError(password, confirmation);
  if (passwordError) return { error: passwordError };
  if (hasPhoto) {
    const photoError = await validateProfilePhoto(photo);
    if (photoError) return { error: photoError };
  }

  const supabase = await createClient(fetchAuthWithDeadline);
  let photoFailed = false;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, first_name: firstName, last_name: lastName, role }, ...captchaOption(readCaptchaToken(formData)) },
    });
    if (isCaptchaError(error)) return { error: CAPTCHA_FAILED_MESSAGE };
    if (error) return { error: error.status === 429 ? "Too many registration attempts. Wait a few minutes and try again." : "Registration could not complete. Try signing in or resetting your password, or try again later." };
    if (!data.session) {
      const confirmationCodeEnabled = process.env.ACCOUNT_EMAIL_ENABLED === "true";
      if (confirmationCodeEnabled) {
        const flow = ACCOUNT_EMAIL_FLOW.signup;
        const jar = await cookies();
        jar.set(flow.cookie, JSON.stringify({ email, purpose: "signup", requestedAt: Date.now(), next: hasPhoto ? "/profile/photo" : "/profile" }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: flow.path, maxAge: ACCOUNT_EMAIL_SECONDS });
      }
      return { error: null, confirmationRequired: true, confirmationEmail: email, confirmationCodeEnabled };
    }
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
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: captchaOption(readCaptchaToken(formData)) });
    if (isCaptchaError(error)) return { error: CAPTCHA_FAILED_MESSAGE };
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

export async function signInWithGoogle(_previous: AuthState, formData: FormData): Promise<AuthState> {
  let destination: string;
  try {
    const requestHeaders = await headers();
    const origin = getGoogleAuthOrigin(requestHeaders.get("origin") ?? "", process.env.SITE_URL, process.env.NODE_ENV === "production");
    // A verifier cookie is host-bound: begin the flow on the configured origin.
    if (requestHeaders.get("origin") !== origin) return { error: "Open the app at its configured address before signing in with Google." };
    const providerError = await checkGoogleProvider(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    if (providerError) return { error: getGoogleAuthMessage(providerError) };
    const callback = new URL("/auth/callback", origin);
    const supabase = await createClient();
    const result = await beginGoogleSignIn(supabase.auth, callback.href, process.env.NEXT_PUBLIC_SUPABASE_URL!);
    if (result.error || !result.url) return { error: getGoogleAuthMessage(result.error ?? "unavailable") };
    const cookieStore = await cookies();
    cookieStore.set(GOOGLE_NEXT_COOKIE, getSafeSignInRedirect(String(formData.get("next") ?? "")), {
      httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), path: "/auth", maxAge: 600,
    });
    destination = result.url;
  } catch {
    return { error: getGoogleAuthMessage("not_configured") };
  }
  // Keep redirect outside the catch; Next.js implements it by throwing.
  redirect(destination);
}
