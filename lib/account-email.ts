import type { SupabaseClient } from "@supabase/supabase-js";

type Auth = SupabaseClient["auth"];
export type AccountEmailPurpose = "signup" | "recovery";
export const ACCOUNT_EMAIL_SECONDS = 600;
export const ACCOUNT_EMAIL_COOLDOWN_SECONDS = 60;
export const ACCOUNT_EMAIL_INVALID_CODE = "That code is invalid or has expired. Use the latest email, or request another code.";
export const ACCOUNT_EMAIL_FLOW = {
  signup: { cookie: "alumnikonneqt-confirm-email", path: "/verify-email", title: "Confirm your email", message: "If confirmation is pending for this address, a code will arrive shortly. Check spam too. Already confirmed? Return to sign in." },
  recovery: { cookie: "alumnikonneqt-recover-email", path: "/forgot-password", title: "Reset your password", message: "If this address has an account, a reset code will arrive shortly. Check spam too. If nothing arrives, try again later." },
} as const;
export interface AccountEmailChallenge { email: string; purpose: AccountEmailPurpose; requestedAt: number; next: string }
export interface AccountEmailState { error: string | null; message: string | null; challenge: AccountEmailChallenge | null; email: string; field?: "email" | "token" | "password" | "confirm_password" }

// Recovery context is never proof of ownership. Every completion verifies a
// fresh provider code in the same action that updates the password.
export function readAccountEmailChallenge(raw: string | undefined, purpose: AccountEmailPurpose, now = Date.now()): AccountEmailChallenge | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.purpose !== purpose || typeof value.email !== "string" || value.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || typeof value.next !== "string" ||
        !Number.isSafeInteger(value.requestedAt) || value.requestedAt > now || now - value.requestedAt >= ACCOUNT_EMAIL_SECONDS * 1000) return null;
    return { email: value.email, purpose, next: value.next, requestedAt: value.requestedAt };
  } catch { return null; }
}

export function accountEmailRetrySeconds(challenge: AccountEmailChallenge | null, now = Date.now()): number {
  return challenge ? Math.max(0, Math.ceil((challenge.requestedAt + ACCOUNT_EMAIL_COOLDOWN_SECONDS * 1000 - now) / 1000)) : 0;
}

export function accountEmailError(status?: number): string {
  if (status === 429) return "Too many attempts. Wait a few minutes before trying again.";
  if (!status || status >= 500) return "The email verification service is temporarily unavailable. Keep this page open and try again shortly.";
  return ACCOUNT_EMAIL_INVALID_CODE;
}

export async function requestAccountEmail(auth: Pick<Auth, "resend" | "resetPasswordForEmail">, purpose: AccountEmailPurpose, email: string): Promise<void> {
  try {
    if (purpose === "signup") await auth.resend({ type: "signup", email });
    else await auth.resetPasswordForEmail(email);
  } catch { /* All valid addresses receive the same non-enumerating response. */ }
}

export async function verifyAccountEmail(auth: Pick<Auth, "verifyOtp">, purpose: AccountEmailPurpose, email: string, token: string): Promise<string | null> {
  if (!/^\d{6,10}$/.test(token)) return "Enter the 6–10 digit code from your email.";
  try {
    const { data, error } = await auth.verifyOtp({ email, token, type: purpose });
    if (error) return accountEmailError(error.status);
    return data.user && data.session ? null : "The code could not establish a session. Request another code.";
  } catch { return accountEmailError(); }
}
