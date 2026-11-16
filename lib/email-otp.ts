import type { SupabaseClient } from "@supabase/supabase-js";
import { CAPTCHA_FAILED_MESSAGE, captchaOption, isCaptchaError } from "./turnstile.ts";

type Auth = SupabaseClient["auth"];
export const OTP_COOKIE = "alumnikonneqt-email-otp";
export const OTP_COOLDOWN_SECONDS = 60;
export const OTP_FLOW_SECONDS = 600;
export const OTP_REQUEST_MESSAGE = "If this email has a registered account, a sign-in code will arrive shortly. Check your spam folder too. If nothing arrives, try again later or use your password.";
export const OTP_INVALID_MESSAGE = "That code is invalid or has expired. Use the most recent email, or request another code.";
export interface OtpChallenge { email: string; next: string; requestedAt: number }
export interface OtpState {
  error: string | null;
  challenge: OtpChallenge | null;
  message: string | null;
}

export function normalizeOtpEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// This cookie is a convenience for refresh/resend, never proof of identity.
// Supabase must validate every code, including when this state is forged.
export function readOtpChallenge(raw: string | undefined, now = Date.now()): OtpChallenge | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || !normalizeOtpEmail(value.email) || typeof value.next !== "string" ||
        !Number.isSafeInteger(value.requestedAt) || value.requestedAt > now ||
        now - value.requestedAt >= OTP_FLOW_SECONDS * 1000) return null;
    return { email: normalizeOtpEmail(value.email)!, next: value.next, requestedAt: value.requestedAt };
  } catch { return null; }
}

export function otpRetrySeconds(challenge: OtpChallenge | null, now = Date.now()): number {
  return challenge ? Math.max(0, Math.ceil((challenge.requestedAt + OTP_COOLDOWN_SECONDS * 1000 - now) / 1000)) : 0;
}

export async function requestEmailOtp(auth: Pick<Auth, "signInWithOtp">, email: string, captchaToken?: string): Promise<string | null> {
  // Never expose provider errors here: unknown accounts can produce a distinct
  // provider response. The same UI and cooldown apply to every valid address.
  // A failed bot check is reported because it happens before any account lookup.
  try {
    const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: false, ...captchaOption(captchaToken) } });
    if (isCaptchaError(error)) return CAPTCHA_FAILED_MESSAGE;
  } catch { /* Generic response also covers transport/delivery failures. */ }
  return null;
}

export async function verifyEmailOtp(auth: Pick<Auth, "verifyOtp">, email: string, token: string, captchaToken?: string): Promise<string | null> {
  if (!/^\d{6,10}$/.test(token)) return "Enter the 6–10 digit code from your email.";
  try {
    const { data, error } = await auth.verifyOtp({ email, token, type: "email", ...(captchaToken ? { options: { captchaToken } } : {}) });
    if (isCaptchaError(error)) return CAPTCHA_FAILED_MESSAGE;
    if (error?.status === 429) return "Too many attempts. Wait a few minutes before trying again.";
    if (error && (!error.status || error.status >= 500)) return "The sign-in service is temporarily unavailable. Keep this page open and try again shortly.";
    if (error || !data.session || !data.user) return OTP_INVALID_MESSAGE;
    return null;
  } catch { return "Could not reach the sign-in service. Try again shortly."; }
}
