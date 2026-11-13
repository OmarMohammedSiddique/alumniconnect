"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthWithDeadline } from "@/lib/supabase/auth-fetch";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";
import { readCaptchaToken } from "@/lib/turnstile";
import { normalizeOtpEmail, OTP_COOKIE, OTP_FLOW_SECONDS, OTP_REQUEST_MESSAGE, otpRetrySeconds, readOtpChallenge, requestEmailOtp, verifyEmailOtp, type OtpState } from "@/lib/email-otp";

export async function emailOtpAction(_previous: OtpState, form: FormData): Promise<OtpState> {
  if (process.env.EMAIL_OTP_ENABLED !== "true") return { error: "Email code sign-in is not available yet. Use your password or Google.", challenge: null, message: null };
  const jar = await cookies();
  const challenge = readOtpChallenge(jar.get(OTP_COOKIE)?.value);
  const intent = form.get("intent");
  if (intent === "edit") {
    jar.set(OTP_COOKIE, "", { path: "/login/code", maxAge: 0 });
    return { error: null, challenge: null, message: null };
  }
  const fail = (error: string): OtpState => ({ error, challenge, message: null });
  if (intent === "verify") {
    // A second tab may have changed the email or requested a newer code.
    if (!challenge || form.get("email") !== challenge.email || String(form.get("requestedAt")) !== String(challenge.requestedAt)) {
      return fail("This sign-in request changed or expired. Request a new code or refresh this page.");
    }
    const supabase = await createClient(fetchAuthWithDeadline);
    const error = await verifyEmailOtp(supabase.auth, challenge.email, String(form.get("token") ?? "").trim(), readCaptchaToken(form));
    if (error) return fail(error);
    jar.set(OTP_COOKIE, "", { path: "/login/code", maxAge: 0 });
    redirect(getSafeSignInRedirect(challenge.next));
  }
  if (intent !== "request" && intent !== "resend") return fail("Choose a sign-in action and try again.");
  const email = intent === "resend" ? challenge?.email : normalizeOtpEmail(form.get("email"));
  if (!email) return fail("Enter a valid email address to request a code.");
  // Browser cooldown is additional friction; provider rate limits are the
  // authoritative protection across instances, tabs, devices and cookie resets.
  if (otpRetrySeconds(challenge) > 0) return fail("Wait one minute between code requests, including when changing email.");
  const next = getSafeSignInRedirect(intent === "resend" ? challenge!.next : String(form.get("next") ?? ""));
  const fresh = { email, next, requestedAt: Date.now() };
  const supabase = await createClient(fetchAuthWithDeadline);
  const captchaError = await requestEmailOtp(supabase.auth, email, readCaptchaToken(form));
  if (captchaError) return fail(captchaError);
  jar.set(OTP_COOKIE, JSON.stringify(fresh), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/login/code", maxAge: OTP_FLOW_SECONDS,
  });
  return { error: null, challenge: fresh, message: OTP_REQUEST_MESSAGE };
}
